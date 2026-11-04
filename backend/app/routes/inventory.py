
import logging

from fastapi import APIRouter, HTTPException, Query
from snowflake.connector.errors import Error as SnowflakeError

from app.db import DatabaseNotConfigured, run_query

logger = logging.getLogger("restaurant_api")

router = APIRouter(prefix="/api", tags=["Inventory"])


def build_filters(
    restaurant_id: int | None,
    search: str | None,
):
    conditions = []
    params = {}

    if restaurant_id is not None:
        conditions.append("restaurant_id = %(restaurant_id)s")
        params["restaurant_id"] = restaurant_id

    if search:
        conditions.append(
            """
            (
                COALESCE(ingredient_name, '') ILIKE %(search)s
                OR COALESCE(ingredient_category_name, '') ILIKE %(search)s
                OR COALESCE(restaurant_name, '') ILIKE %(search)s
                OR COALESCE(unit, '') ILIKE %(search)s
            )
            """
        )
        params["search"] = f"%{search}%"

    where_clause = ""
    if conditions:
        where_clause = " AND " + " AND ".join(conditions)

    return where_clause, params


@router.get("/inventory")
def get_inventory(
    restaurant_id: int | None = Query(default=None, ge=1),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
):
    where_clause, params = build_filters(restaurant_id, search)

    try:
        summary_rows = run_query(
            f"""
            SELECT
                COUNT(*) AS INVENTORY_RECORDS,
                COUNT(DISTINCT ingredient_id) AS DISTINCT_INGREDIENTS,
                COUNT(DISTINCT restaurant_id) AS RESTAURANT_COUNT
            FROM RESTAURANT_DB.MARTS.FCT_INVENTORY
            WHERE 1 = 1 {where_clause}
            """,
            params,
        )

        category_rows = run_query(
            f"""
            SELECT
                COALESCE(
                    ingredient_category_name, 'Uncategorized'
                ) AS CATEGORY,
                unit,
                COUNT(*) AS INVENTORY_RECORDS,
                COUNT(DISTINCT ingredient_id) AS DISTINCT_INGREDIENTS,
                COALESCE(SUM(quantity_on_hand), 0) AS QUANTITY_ON_HAND
            FROM RESTAURANT_DB.MARTS.FCT_INVENTORY
            WHERE 1 = 1 {where_clause}
            GROUP BY
                COALESCE(ingredient_category_name, 'Uncategorized'),
                unit
            ORDER BY CATEGORY, unit
            """,
            params,
        )

        restaurant_rows = run_query(
            f"""
            SELECT
                restaurant_id,
                restaurant_name,
                unit,
                COUNT(*) AS INVENTORY_RECORDS,
                COALESCE(SUM(quantity_on_hand), 0) AS QUANTITY_ON_HAND
            FROM RESTAURANT_DB.MARTS.FCT_INVENTORY
            WHERE 1 = 1 {where_clause}
            GROUP BY restaurant_id, restaurant_name, unit
            ORDER BY restaurant_name, unit
            """,
            params,
        )

        item_rows = run_query(
            f"""
            SELECT
                inventory_id,
                restaurant_id,
                restaurant_name,
                ingredient_id,
                ingredient_name,
                COALESCE(
                    ingredient_category_name, 'Uncategorized'
                ) AS CATEGORY,
                unit,
                quantity_on_hand
            FROM RESTAURANT_DB.MARTS.FCT_INVENTORY
            WHERE 1 = 1 {where_clause}
            ORDER BY quantity_on_hand DESC NULLS LAST
            LIMIT %(limit)s
            """,
            {**params, "limit": limit},
        )

    except DatabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except SnowflakeError as exc:
        logger.exception("Inventory query failed")
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve inventory data from Snowflake. Check the API terminal.",
        ) from exc

    summary = summary_rows[0]

    return {
        "filters": {
            "restaurant_id": restaurant_id,
            "search": search,
            "limit": limit,
        },
        "summary": {
            "inventory_records": int(summary["INVENTORY_RECORDS"] or 0),
            "distinct_ingredients": int(
                summary["DISTINCT_INGREDIENTS"] or 0
            ),
            "restaurant_count": int(summary["RESTAURANT_COUNT"] or 0),
        },
        "category_performance": [
            {
                "category": row["CATEGORY"],
                "unit": row["UNIT"],
                "inventory_records": int(row["INVENTORY_RECORDS"] or 0),
                "distinct_ingredients": int(
                    row["DISTINCT_INGREDIENTS"] or 0
                ),
                "quantity_on_hand": float(
                    row["QUANTITY_ON_HAND"] or 0
                ),
            }
            for row in category_rows
        ],
        "restaurant_performance": [
            {
                "restaurant_id": (
                    int(row["RESTAURANT_ID"])
                    if row["RESTAURANT_ID"] is not None else None
                ),
                "restaurant_name": row["RESTAURANT_NAME"],
                "unit": row["UNIT"],
                "inventory_records": int(row["INVENTORY_RECORDS"] or 0),
                "quantity_on_hand": float(
                    row["QUANTITY_ON_HAND"] or 0
                ),
            }
            for row in restaurant_rows
        ],
        "inventory_items": [
            {
                "inventory_id": (
                    int(row["INVENTORY_ID"])
                    if row["INVENTORY_ID"] is not None else None
                ),
                "restaurant_id": (
                    int(row["RESTAURANT_ID"])
                    if row["RESTAURANT_ID"] is not None else None
                ),
                "restaurant_name": row["RESTAURANT_NAME"],
                "ingredient_id": (
                    int(row["INGREDIENT_ID"])
                    if row["INGREDIENT_ID"] is not None else None
                ),
                "ingredient_name": row["INGREDIENT_NAME"],
                "category": row["CATEGORY"],
                "unit": row["UNIT"],
                "quantity_on_hand": (
                    float(row["QUANTITY_ON_HAND"])
                    if row["QUANTITY_ON_HAND"] is not None else None
                ),
            }
            for row in item_rows
        ],
    }
