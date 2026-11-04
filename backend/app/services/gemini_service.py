from dotenv import load_dotenv
load_dotenv()

import csv
import io
import json
import re
import uuid

from datetime import date, datetime
from decimal import Decimal
from functools import lru_cache

from google import genai
from google.genai import types

from app.db import run_query


# --------------------------------------------------
# Configuration
# --------------------------------------------------

MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
]

MAX_ROWS = 200
ROWS_SENT_TO_GEMINI = 30

ALLOWED_TABLES = {
    "fct_daily_sales",
    "fct_menu_item_performance",
    "fct_inventory",
    "fct_restaurant_reviews",
}

FORBIDDEN = re.compile(
    r"\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|"
    r"call|copy|put|get|execute|use|set|remove|undrop|rename)\b",
    re.IGNORECASE,
)


# --------------------------------------------------
# Database schema supplied to Gemini
# --------------------------------------------------

SCHEMA = """
You work with a Snowflake database for a restaurant company.

Tables (schema MARTS, use the plain table names):

fct_daily_sales (one row per restaurant per day)
  daily_sales_key, restaurant_id, order_date, order_count, items_sold,
  sales_all_open_and_completed, completed_sales, payments_recorded
  completed_sales is the revenue figure. This table has no restaurant name.

fct_menu_item_performance (one row per menu item)
  menu_item_id, menu_item_name, category_name, restaurant_id, price,
  orders_containing_item, units_sold, revenue

fct_inventory (one row per stock record)
  inventory_id, restaurant_id, restaurant_name, ingredient_id, ingredient_name,
  ingredient_category_name, unit, quantity_on_hand

fct_restaurant_reviews (one row per restaurant)
  restaurant_id, restaurant_name, review_count, average_rating, lowest_rating,
  highest_rating, first_review_date, latest_review_date
"""


PLANNER_RULES = """
You write Snowflake SQL.

Reply with JSON only, in exactly this format:
{"queries": [{"title": "short title", "sql": "SELECT ..."}]}

Rules:
- Each SQL query must be ONE read-only SELECT using only the four tables above.
- To show a restaurant name next to sales or menu data, join to
  fct_restaurant_reviews on restaurant_id.
- Never use EXTRACT or TRIM(... FROM ...).
  Use YEAR(), MONTH(), DAYNAME() instead.
- Give columns readable aliases.
- Aggregate where sensible.
- Return at most 50 rows per query.
- For strategy, advice, ideas, causes, or improvement questions,
  fetch relevant evidence rather than refusing.
- If the question has nothing to do with these tables,
  return {"queries": []}.
"""


ANALYST_PROMPT = """
You are a practical restaurant business analyst.

Answer the user's question using ONLY the data provided.
Do not invent numbers or make unsupported assumptions.

Format your answer in Markdown with these three headings:

### Key findings
2 to 4 bullets, each with specific numbers from the data.

### Recommended actions
3 to 5 concrete, practical actions tied to those findings.

### Caveats
One or two short bullets.

Important context:
- This is small synthetic sample data.
- Order status and payments are inconsistent.
- completed_sales is the revenue measure.
- Inventory quantities use different units and should not be
  compared directly across different ingredients.

Use plain English and keep it concise.
"""


# --------------------------------------------------
# Gemini client
# --------------------------------------------------

@lru_cache(maxsize=1)
def get_gemini():
    """
    Create one reusable Gemini client.

    The client reads GEMINI_API_KEY from the environment.
    Never put the API key in frontend code.
    """
    return genai.Client()


def ask_gemini(contents, system, json_mode=False, temperature=0.0):
    """
    Call Gemini.
    Try Gemini Flash Lite if Flash is busy or over quota.
    """

    last_error = None

    for model in MODELS:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system,
                temperature=temperature,
                response_mime_type=(
                    "application/json" if json_mode else None
                ),
            )

            response = get_gemini().models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )

            return response.text or ""

        except Exception as exc:
            last_error = exc

            busy = any(
                code in str(exc)
                for code in (
                    "503",
                    "429",
                    "UNAVAILABLE",
                    "RESOURCE_EXHAUSTED",
                )
            )

            if not busy:
                raise

    raise last_error


# --------------------------------------------------
# SQL cleaning and safety validation
# --------------------------------------------------

def strip_fences(text):
    text = text.strip()

    if text.startswith("```"):
        text = text[3:]
        text = re.sub(
            r"^\s*(json|sql)\b",
            "",
            text,
            flags=re.IGNORECASE,
        )

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


def clean_sql(raw):
    text = strip_fences(raw)

    text = re.sub(r"--[^\n]*", " ", text)
    text = re.sub(
        r"/\*.*?\*/",
        " ",
        text,
        flags=re.DOTALL,
    )

    return text.strip().rstrip(";").strip()


def check_sql(sql):
    """
    Check that Gemini generated a query against an allowed mart.

    This is an application-level safety check, not a complete
    SQL security boundary. A dedicated read-only Snowflake role
    should also restrict database permissions.
    """

    if ";" in sql:
        return "Only one SQL statement is allowed."

    if not re.match(r"^\s*(select|with)\b", sql, re.IGNORECASE):
        return "Only SELECT queries are allowed."

    bad = FORBIDDEN.search(sql)

    if bad:
        return f"The word '{bad.group(0)}' is not allowed."

    cte_names = {
        match.lower()
        for match in re.findall(
            r"\b(\w+)\s+as\s*\(",
            sql,
            re.IGNORECASE,
        )
    }

    references = re.findall(
        r"\b(?:from|join)\s+([\w.\"]+)",
        sql,
        re.IGNORECASE,
    )

    if not references:
        return "The query must read from an approved mart table."

    for reference in references:
        name = reference.replace('"', "").split(".")[-1].lower()

        if name not in ALLOWED_TABLES and name not in cte_names:
            return (
                f"The table '{reference}' is not allowed. "
                "Only the four mart tables can be used."
            )

    return None


# --------------------------------------------------
# Gemini SQL planning
# --------------------------------------------------

def make_plan(question, limit):
    raw = ask_gemini(
        question,
        SCHEMA + PLANNER_RULES + f"\nWrite at most {limit} queries.",
        json_mode=True,
    )

    data = json.loads(strip_fences(raw))

    items = data.get("queries", []) if isinstance(data, dict) else data

    plan = []

    for item in items[:limit]:
        if isinstance(item, dict) and item.get("sql"):
            plan.append(
                {
                    "title": str(item.get("title") or "Query"),
                    "sql": clean_sql(str(item["sql"])),
                }
            )

    return plan


# --------------------------------------------------
# Snowflake query execution
# --------------------------------------------------

def make_json_safe(value):
    """Convert Snowflake values into JSON-compatible values."""

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return value


def run_analyst_sql(sql):
    """
    Execute a validated query using the existing FastAPI
    Snowflake connection helper.
    """

    wrapped_sql = f"""
        SELECT *
        FROM (
            {sql}
        )
        LIMIT {MAX_ROWS}
    """

    rows = run_query(wrapped_sql, None)

    safe_rows = []

    for row in rows:
        safe_rows.append(
            {
                str(key).lower(): make_json_safe(value)
                for key, value in row.items()
            }
        )

    columns = list(safe_rows[0].keys()) if safe_rows else []

    return {
        "columns": columns,
        "rows": safe_rows,
    }


# --------------------------------------------------
# AI findings and recommendations
# --------------------------------------------------

def write_analysis(question, results):
    parts = [f"Question: {question}"]

    for item in results:
        output = io.StringIO()

        rows = item["rows"]

        if rows:
            writer = csv.DictWriter(
                output,
                fieldnames=list(rows[0].keys()),
            )

            writer.writeheader()
            writer.writerows(rows[:ROWS_SENT_TO_GEMINI])

        data_text = output.getvalue()[:6000]

        parts.append(
            f"Data: {item['title']}\n{data_text}"
        )

    return ask_gemini(
        "\n\n".join(parts),
        ANALYST_PROMPT,
        temperature=0.3,
    )


# --------------------------------------------------
# Main analysis function used by FastAPI
# --------------------------------------------------

def analyze_question(question, insights=True):
    """
    Run the complete analysis workflow.

    insights=True:
        Up to three queries + Gemini findings and recommendations.

    insights=False:
        One query + data table only.
    """

    question = question.strip()

    if not question:
        raise ValueError("Please enter a question.")

    query_limit = 3 if insights else 1

    plan = make_plan(question, query_limit)

    if not plan:
        return {
            "id": str(uuid.uuid4()),
            "question": question,
            "insights": insights,
            "summary": (
                "These tables cannot answer that question. "
                "Try asking about sales, menu items, inventory or reviews."
            ),
            "analysis": None,
            "results": [],
        }

    results = []

    for step in plan:
        item = {
            "title": step["title"],
            "sql": step["sql"],
            "columns": [],
            "rows": [],
            "error": None,
        }

        problem = check_sql(step["sql"])

        if problem:
            item["error"] = f"Blocked for safety: {problem}"

        else:
            try:
                query_result = run_analyst_sql(step["sql"])

                item["columns"] = query_result["columns"]
                item["rows"] = query_result["rows"]

            except Exception as exc:
                item["error"] = (
                    f"The query failed: {str(exc)[:200]}"
                )

        results.append(item)

    usable = [
        {
            "title": item["title"],
            "rows": item["rows"],
        }
        for item in results
        if item["rows"] and not item["error"]
    ]

    analysis = None

    if insights and usable:
        analysis = write_analysis(question, usable)

    return {
        "id": str(uuid.uuid4()),
        "question": question,
        "insights": insights,
        "summary": (
            "Analysis completed."
            if usable
            else "No usable data was returned by the queries."
        ),
        "analysis": analysis,
        "results": results,
    }