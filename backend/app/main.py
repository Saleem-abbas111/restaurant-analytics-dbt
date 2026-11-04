import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from snowflake.connector.errors import Error as SnowflakeError
from app.routes.overview import router as overview_router
from app.routes.menu import router as menu_router
from app.routes.inventory import router as inventory_router
from app.routes.reviews import router as reviews_router
from fastapi.middleware.cors import CORSMiddleware
from app.db import DatabaseNotConfigured, run_query
from app.routes.analyst import router as analyst_router

logger = logging.getLogger("restaurant_api")

app = FastAPI(title="Restaurant Intelligence API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(overview_router)
app.include_router(menu_router)
app.include_router(inventory_router)
app.include_router(reviews_router)
app.include_router(analyst_router)


class Health(BaseModel):
    status: str
    service: str


class DatabaseHealth(BaseModel):
    status: str
    role: str
    database: str
    schema_name: str
    daily_sales_rows: int


@app.get("/api/health", response_model=Health)
def health() -> Health:
    """Is the API process running? Does not touch Snowflake."""
    return Health(status="ok", service="restaurant-intelligence-api")


@app.get("/api/health/db", response_model=DatabaseHealth)
def health_db() -> DatabaseHealth:
    """Can the API read the MARTS schema with its read-only role?"""
    try:
        rows = run_query(
            "SELECT CURRENT_ROLE() AS ROLE, CURRENT_DATABASE() AS DB, CURRENT_SCHEMA() AS SCH, "
            "(SELECT COUNT(*) FROM fct_daily_sales) AS DAILY_SALES_ROWS"
        )
    except DatabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except SnowflakeError as exc:
        logger.exception("Snowflake health check failed")
        raise HTTPException(status_code=502, detail="Could not query Snowflake. See the API terminal for details.") from exc
    row = rows[0]
    return DatabaseHealth(
        status="ok",
        role=row["ROLE"],
        database=row["DB"],
        schema_name=row["SCH"],
        daily_sales_rows=int(row["DAILY_SALES_ROWS"]),
    )
