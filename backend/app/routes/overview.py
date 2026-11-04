import logging
from datetime import date

from fastapi import APIRouter, HTTPException, Query
from snowflake.connector.errors import Error as SnowflakeError

from app.db import DatabaseNotConfigured, run_query

logger = logging.getLogger("restaurant_api")

router = APIRouter(prefix="/api", tags=["Overview"])


def build_filters(
    start_date: date | None,
    end_date: date | None,
    restaurant_id: str | None,
    alias: str = "",
) -> tuple[str, dict]:
    prefix = f"{alias}." if alias else ""
    conditions = []
    params = {}

    if start_date:
        conditions.append(f"{prefix}order_date >= TO_DATE(%(start_date)s)")
        params["start_date"] = start_date.isoformat()

    if end_date:
        conditions.append(f"{prefix}order_date <= TO_DATE(%(end_date)s)")
        params["end_date"] = end_date.isoformat()

    if restaurant_id:
        conditions.append(f"{prefix}restaurant_id = %(restaurant_id)s")
        params["restaurant_id"] = restaurant_id

    where_clause = ""
    if conditions:
        where_clause = " AND " + " AND ".join(conditions)

    return where_clause, params


@router.get("/restaurants")
def get_restaurants():
    try:
        rows = run_query(
            """
            SELECT
                sales.restaurant_id,
                COALESCE(
                    MAX(reviews.restaurant_name),
                    TO_VARCHAR(sales.restaurant_id)
                ) AS restaurant_name
            FROM RESTAURANT_DB.MARTS.FCT_DAILY_SALES AS sales
            LEFT JOIN RESTAURANT_DB.MARTS.FCT_RESTAURANT_REVIEWS AS reviews
                ON sales.restaurant_id = reviews.restaurant_id
            GROUP BY sales.restaurant_id
            ORDER BY restaurant_name
            """
        )

        return [
            {
                "restaurant_id": str(row["RESTAURANT_ID"]),
                "name": row["RESTAURANT_NAME"],
            }
            for row in rows
        ]

    except DatabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except SnowflakeError as exc:
        logger.exception("Restaurant list query failed")
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve restaurants from Snowflake.",
        ) from exc

@router.get("/overview")
def get_overview(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    restaurant_id: str | None = Query(default=None),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date.",
        )

    where_clause, params = build_filters(
        start_date, end_date, restaurant_id
    )

    restaurant_where, restaurant_params = build_filters(
        start_date, end_date, restaurant_id, alias="sales"
    )

    try:
        summary_rows = run_query(
            f"""
            SELECT
                COALESCE(SUM(sales_all_open_and_completed), 0) AS TOTAL_SALES,
                COALESCE(SUM(completed_sales), 0) AS COMPLETED_SALES,
                COALESCE(SUM(order_count), 0) AS ORDER_COUNT,
                COALESCE(SUM(items_sold), 0) AS ITEMS_SOLD,
                COUNT(DISTINCT restaurant_id) AS RESTAURANT_COUNT,
                MIN(order_date) AS PERIOD_START,
                MAX(order_date) AS PERIOD_END
            FROM RESTAURANT_DB.MARTS.FCT_DAILY_SALES
            WHERE 1 = 1 {where_clause}
            """,
            params,
        )

        daily_rows = run_query(
            f"""
            SELECT
                order_date,
                SUM(sales_all_open_and_completed) AS SALES,
                SUM(completed_sales) AS COMPLETED_SALES,
                SUM(order_count) AS ORDERS,
                SUM(items_sold) AS ITEMS_SOLD
            FROM RESTAURANT_DB.MARTS.FCT_DAILY_SALES
            WHERE 1 = 1 {where_clause}
            GROUP BY order_date
            ORDER BY order_date
            """,
            params,
        )

        weekday_rows = run_query(
            f"""
            SELECT
                DAYOFWEEKISO(order_date) AS WEEKDAY_NUMBER,
                SUM(sales_all_open_and_completed) AS SALES,
                SUM(order_count) AS ORDERS
            FROM RESTAURANT_DB.MARTS.FCT_DAILY_SALES
            WHERE 1 = 1 {where_clause}
            GROUP BY DAYOFWEEKISO(order_date)
            ORDER BY WEEKDAY_NUMBER
            """,
            params,
        )

        restaurant_rows = run_query(
            f"""
            SELECT
                sales.restaurant_id,
                COALESCE(
                    MAX(reviews.restaurant_name),
                    TO_VARCHAR(sales.restaurant_id)
                ) AS RESTAURANT_NAME,
                SUM(sales.sales_all_open_and_completed) AS TOTAL_SALES,
                SUM(sales.completed_sales) AS COMPLETED_SALES,
                SUM(sales.order_count) AS ORDER_COUNT,
                MAX(reviews.average_rating) AS AVERAGE_RATING
            FROM RESTAURANT_DB.MARTS.FCT_DAILY_SALES AS sales
            LEFT JOIN RESTAURANT_DB.MARTS.FCT_RESTAURANT_REVIEWS AS reviews
                ON sales.restaurant_id = reviews.restaurant_id
            WHERE 1 = 1 {restaurant_where}
            GROUP BY sales.restaurant_id
            ORDER BY TOTAL_SALES DESC
            LIMIT 10
            """,
            restaurant_params,
        )

    except DatabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except SnowflakeError as exc:
        logger.exception("Overview query failed")
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve overview data from Snowflake. Check the API terminal.",
        ) from exc

    summary = summary_rows[0]
    total_sales = float(summary["TOTAL_SALES"] or 0)
    order_count = int(summary["ORDER_COUNT"] or 0)

    weekday_names = {
        1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu",
        5: "Fri", 6: "Sat", 7: "Sun",
    }

    return {
        "filters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "restaurant_id": restaurant_id,
        },
        "summary": {
            "total_sales": total_sales,
            "completed_sales": float(summary["COMPLETED_SALES"] or 0),
            "order_count": order_count,
            "items_sold": int(summary["ITEMS_SOLD"] or 0),
            "average_order_value": (
                round(total_sales / order_count, 2) if order_count else 0
            ),
            "restaurant_count": int(summary["RESTAURANT_COUNT"] or 0),
            "period_start": (
                summary["PERIOD_START"].isoformat()
                if summary["PERIOD_START"] else None
            ),
            "period_end": (
                summary["PERIOD_END"].isoformat()
                if summary["PERIOD_END"] else None
            ),
        },
        "daily_sales": [
            {
                "date": row["ORDER_DATE"].isoformat(),
                "sales": float(row["SALES"] or 0),
                "completed_sales": float(row["COMPLETED_SALES"] or 0),
                "orders": int(row["ORDERS"] or 0),
                "items_sold": int(row["ITEMS_SOLD"] or 0),
            }
            for row in daily_rows
        ],
        "weekday_sales": [
            {
                "day": weekday_names[int(row["WEEKDAY_NUMBER"])],
                "sales": float(row["SALES"] or 0),
                "orders": int(row["ORDERS"] or 0),
            }
            for row in weekday_rows
        ],
        "top_restaurants": [
            {
                "restaurant_id": str(row["RESTAURANT_ID"]),
                "name": row["RESTAURANT_NAME"],
                "sales": float(row["TOTAL_SALES"] or 0),
                "completed_sales": float(row["COMPLETED_SALES"] or 0),
                "orders": int(row["ORDER_COUNT"] or 0),
                "average_rating": (
                    float(row["AVERAGE_RATING"])
                    if row["AVERAGE_RATING"] is not None else None
                ),
            }
            for row in restaurant_rows
        ],
    }