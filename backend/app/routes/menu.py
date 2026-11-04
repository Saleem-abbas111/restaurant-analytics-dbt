import logging

from fastapi import APIRouter, HTTPException, Query
from snowflake.connector.errors import Error as SnowflakeError

from app.db import DatabaseNotConfigured, run_query

logger = logging.getLogger("restaurant_api")

router = APIRouter(prefix="/api", tags=["Menu"])


def build_filter(restaurant_id: int | None):
    if restaurant_id is None:
        return "", {}

    return " AND restaurant_id = %(restaurant_id)s", {
        "restaurant_id": restaurant_id
    }


@router.get("/menu")
def get_menu(
    restaurant_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    where_clause, params = build_filter(restaurant_id)

    try:
        summary_rows = run_query(
            f"""
            SELECT
                COUNT(DISTINCT menu_item_id) AS TOTAL_MENU_ITEMS,
                COALESCE(SUM(units_sold), 0) AS TOTAL_UNITS_SOLD,
                COALESCE(SUM(revenue), 0) AS TOTAL_REVENUE,
                COUNT(DISTINCT restaurant_id) AS RESTAURANT_COUNT
            FROM RESTAURANT_DB.MARTS.FCT_MENU_ITEM_PERFORMANCE
            WHERE 1 = 1 {where_clause}
            """,
            params,
        )

        category_rows = run_query(
            f"""
            SELECT
                COALESCE(category_name, 'Uncategorized') AS CATEGORY,
                COUNT(DISTINCT menu_item_id) AS MENU_ITEMS,
                COALESCE(SUM(units_sold), 0) AS UNITS_SOLD,
                COALESCE(SUM(revenue), 0) AS REVENUE
            FROM RESTAURANT_DB.MARTS.FCT_MENU_ITEM_PERFORMANCE
            WHERE 1 = 1 {where_clause}
            GROUP BY COALESCE(category_name, 'Uncategorized')
            ORDER BY REVENUE DESC
            """,
            params,
        )

        item_rows = run_query(
            f"""
            SELECT
                menu_item_id,
                menu_item_name,
                COALESCE(category_name, 'Uncategorized') AS CATEGORY,
                restaurant_id,
                price,
                SUM(orders_containing_item) AS ORDERS_CONTAINING_ITEM,
                SUM(units_sold) AS UNITS_SOLD,
                SUM(revenue) AS REVENUE
            FROM RESTAURANT_DB.MARTS.FCT_MENU_ITEM_PERFORMANCE
            WHERE 1 = 1 {where_clause}
            GROUP BY
                menu_item_id,
                menu_item_name,
                category_name,
                restaurant_id,
                price
            ORDER BY REVENUE DESC
            LIMIT %(limit)s
            """,
            {**params, "limit": limit},
        )

    except DatabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except SnowflakeError as exc:
        logger.exception("Menu query failed")
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve menu data from Snowflake. Check the API terminal.",
        ) from exc

    summary = summary_rows[0]

    return {
        "filters": {
            "restaurant_id": restaurant_id,
            "limit": limit,
        },
        "summary": {
            "total_menu_items": int(summary["TOTAL_MENU_ITEMS"] or 0),
            "total_units_sold": int(summary["TOTAL_UNITS_SOLD"] or 0),
            "total_revenue": float(summary["TOTAL_REVENUE"] or 0),
            "restaurant_count": int(summary["RESTAURANT_COUNT"] or 0),
        },
        "category_performance": [
            {
                "category": row["CATEGORY"],
                "menu_items": int(row["MENU_ITEMS"] or 0),
                "units_sold": int(row["UNITS_SOLD"] or 0),
                "revenue": float(row["REVENUE"] or 0),
            }
            for row in category_rows
        ],
        "menu_items": [
            {
                "menu_item_id": (
                    int(row["MENU_ITEM_ID"])
                    if row["MENU_ITEM_ID"] is not None else None
                ),
                "name": row["MENU_ITEM_NAME"],
                "category": row["CATEGORY"],
                "restaurant_id": (
                    int(row["RESTAURANT_ID"])
                    if row["RESTAURANT_ID"] is not None else None
                ),
                "price": (
                    float(row["PRICE"])
                    if row["PRICE"] is not None else None
                ),
                "orders_containing_item": int(
                    row["ORDERS_CONTAINING_ITEM"] or 0
                ),
                "units_sold": int(row["UNITS_SOLD"] or 0),
                "revenue": float(row["REVENUE"] or 0),
            }
            for row in item_rows
        ],
    }