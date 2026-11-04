
import logging

from fastapi import APIRouter, HTTPException, Query
from snowflake.connector.errors import Error as SnowflakeError

from app.db import DatabaseNotConfigured, run_query

logger = logging.getLogger("restaurant_api")

router = APIRouter(prefix="/api", tags=["Reviews"])


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
            "COALESCE(restaurant_name, '') ILIKE %(search)s"
        )
        params["search"] = f"%{search}%"

    where_clause = ""
    if conditions:
        where_clause = " AND " + " AND ".join(conditions)

    return where_clause, params


@router.get("/reviews")
def get_reviews(
    restaurant_id: int | None = Query(default=None, ge=1),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
):
    where_clause, params = build_filters(restaurant_id, search)

    try:
        summary_rows = run_query(
            f"""
            SELECT
                COALESCE(SUM(review_count), 0) AS TOTAL_REVIEWS,

                COUNT(DISTINCT restaurant_id) AS RESTAURANT_COUNT,

                SUM(
                    average_rating * review_count
                ) / NULLIF(SUM(
                    IFF(average_rating IS NOT NULL, review_count, 0)
                ), 0) AS WEIGHTED_AVERAGE_RATING,

                MIN(lowest_rating) AS LOWEST_RATING,
                MAX(highest_rating) AS HIGHEST_RATING,

                MIN(first_review_date) AS FIRST_REVIEW_DATE,
                MAX(latest_review_date) AS LATEST_REVIEW_DATE

            FROM RESTAURANT_DB.MARTS.FCT_RESTAURANT_REVIEWS
            WHERE 1 = 1 {where_clause}
            """,
            params,
        )

        restaurant_rows = run_query(
            f"""
            SELECT
                restaurant_id,
                restaurant_name,
                review_count,
                average_rating,
                lowest_rating,
                highest_rating,
                first_review_date,
                latest_review_date
            FROM RESTAURANT_DB.MARTS.FCT_RESTAURANT_REVIEWS
            WHERE 1 = 1 {where_clause}
            ORDER BY average_rating DESC NULLS LAST, review_count DESC
            LIMIT %(limit)s
            """,
            {**params, "limit": limit},
        )

    except DatabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except SnowflakeError as exc:
        logger.exception("Reviews query failed")
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve reviews data from Snowflake. Check the API terminal.",
        ) from exc

    summary = summary_rows[0]

    return {
        "filters": {
            "restaurant_id": restaurant_id,
            "search": search,
            "limit": limit,
        },
        "summary": {
            "total_reviews": int(summary["TOTAL_REVIEWS"] or 0),
            "restaurant_count": int(summary["RESTAURANT_COUNT"] or 0),
            "weighted_average_rating": (
                float(summary["WEIGHTED_AVERAGE_RATING"])
                if summary["WEIGHTED_AVERAGE_RATING"] is not None
                else None
            ),
            "lowest_rating": (
                float(summary["LOWEST_RATING"])
                if summary["LOWEST_RATING"] is not None
                else None
            ),
            "highest_rating": (
                float(summary["HIGHEST_RATING"])
                if summary["HIGHEST_RATING"] is not None
                else None
            ),
            "first_review_date": (
                summary["FIRST_REVIEW_DATE"].isoformat()
                if summary["FIRST_REVIEW_DATE"] else None
            ),
            "latest_review_date": (
                summary["LATEST_REVIEW_DATE"].isoformat()
                if summary["LATEST_REVIEW_DATE"] else None
            ),
        },
        "restaurants": [
            {
                "restaurant_id": (
                    int(row["RESTAURANT_ID"])
                    if row["RESTAURANT_ID"] is not None else None
                ),
                "restaurant_name": row["RESTAURANT_NAME"],
                "review_count": int(row["REVIEW_COUNT"] or 0),
                "average_rating": (
                    float(row["AVERAGE_RATING"])
                    if row["AVERAGE_RATING"] is not None else None
                ),
                "lowest_rating": (
                    float(row["LOWEST_RATING"])
                    if row["LOWEST_RATING"] is not None else None
                ),
                "highest_rating": (
                    float(row["HIGHEST_RATING"])
                    if row["HIGHEST_RATING"] is not None else None
                ),
                "first_review_date": (
                    row["FIRST_REVIEW_DATE"].isoformat()
                    if row["FIRST_REVIEW_DATE"] else None
                ),
                "latest_review_date": (
                    row["LATEST_REVIEW_DATE"].isoformat()
                    if row["LATEST_REVIEW_DATE"] else None
                ),
            }
            for row in restaurant_rows
        ],
    }
