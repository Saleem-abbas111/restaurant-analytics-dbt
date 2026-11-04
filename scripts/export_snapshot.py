"""Export the four MARTS tables to CSV files.

The data is synthetic and the marts contain no personal data. The CSV files can be
used for a public demo that does not need a live Snowflake connection, and they are
also a backup of your results if the Snowflake trial ends.

Run from the project root, with the SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER and
SNOWFLAKE_PASSWORD variables set in the terminal:
    python scripts\\export_snapshot.py
"""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.db import run_query  # noqa: E402  (reuses the API's read-only connection)

TABLES = [
    "fct_daily_sales",
    "fct_menu_item_performance",
    "fct_inventory",
    "fct_restaurant_reviews",
]

out_dir = ROOT / "data" / "snapshot"
out_dir.mkdir(parents=True, exist_ok=True)

for table in TABLES:
    rows = run_query(f"SELECT * FROM {table}")
    if not rows:
        print(f"{table}: no rows, skipped")
        continue
    columns = [name.lower() for name in rows[0].keys()]
    with open(out_dir / f"{table}.csv", "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(columns)
        for row in rows:
            writer.writerow(list(row.values()))
    print(f"{table}: {len(rows)} rows")

print(f"Done. Files are in {out_dir}")