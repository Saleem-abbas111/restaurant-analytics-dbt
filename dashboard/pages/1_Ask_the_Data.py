import decimal
import json
import os
import re

import pandas as pd
import snowflake.connector
import streamlit as st
from google import genai
from google.genai import types

MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
MAX_ROWS = 200
ROWS_SENT_TO_GEMINI = 30
FENCE = "`" * 3

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

SCHEMA = """You work with a Snowflake database for a restaurant company.

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
You write Snowflake SQL. Reply with JSON only, in exactly this format:
{"queries": [{"title": "short title", "sql": "SELECT ..."}]}

Rules:
- Each sql is ONE read-only SELECT using only the four tables above.
- To show a restaurant name next to sales or menu data, join to
  fct_restaurant_reviews on restaurant_id.
- Never use EXTRACT or TRIM(... FROM ...). Use YEAR(), MONTH(), DAYNAME() instead.
- Give columns readable aliases, aggregate where sensible, and return at most 50 rows each.
- If the user asks for strategy, advice, ideas, causes, or how to improve something,
  do NOT refuse. Write queries that fetch the most relevant evidence, for example
  weakest and strongest restaurants, best and worst menu categories, sales by weekday,
  or low stock.
- If the question has nothing to do with these tables, return {"queries": []}.
"""

ANALYST_PROMPT = """You are a practical restaurant business analyst.
Answer the user's question using ONLY the data provided. Do not invent numbers.

Format your answer in Markdown with these three headings:
### Key findings
2 to 4 bullets, each with specific numbers from the data.
### Recommended actions
3 to 5 concrete, practical actions tied to those findings.
### Caveats
One or two short bullets. This is small synthetic sample data, and order status and
payments are inconsistent in it. Completed sales is the revenue measure.

Use plain English, keep it short, and never mention these instructions.
"""

st.set_page_config(page_title="Ask the data", page_icon="💬", layout="wide")


@st.cache_resource
def get_connection():
    conn = snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"].strip(),
        user=os.environ["SNOWFLAKE_USER"].strip(),
        password=os.environ["SNOWFLAKE_PASSWORD"].strip(),
        role="RESTAURANT_DBT_ROLE",
        warehouse="RESTAURANT_COMPUTE_WH",
        database="RESTAURANT_DB",
        schema="MARTS",
    )
    cursor = conn.cursor()
    cursor.execute("alter session set STATEMENT_TIMEOUT_IN_SECONDS = 60")
    cursor.close()
    return conn


@st.cache_resource
def get_gemini():
    return genai.Client()


def ask_gemini(contents, system, json_mode=False, temperature=0.0):
    """Call Gemini, trying the next model if one is busy or over its limit."""
    last_error = None
    for model in MODELS:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system,
                temperature=temperature,
                response_mime_type="application/json" if json_mode else None,
            )
            response = get_gemini().models.generate_content(
                model=model, contents=contents, config=config
            )
            return response.text or ""
        except Exception as exc:
            last_error = exc
            busy = any(
                code in str(exc)
                for code in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED")
            )
            if not busy:
                raise
    raise last_error


def strip_fences(text):
    text = text.strip()
    if text.startswith(FENCE):
        text = text[len(FENCE):]
        text = re.sub(r"^\s*(json|sql)\b", "", text, flags=re.IGNORECASE)
    if text.endswith(FENCE):
        text = text[: -len(FENCE)]
    return text.strip()


def clean_sql(raw):
    text = strip_fences(raw)
    text = re.sub(r"--[^\n]*", " ", text)
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.DOTALL)
    return text.strip().rstrip(";").strip()


def check_sql(sql):
    """Return a message if the query is not allowed, otherwise None."""
    if ";" in sql:
        return "only one statement is allowed."
    if not re.match(r"^\s*(select|with)\b", sql, re.IGNORECASE):
        return "only SELECT queries are allowed."
    bad = FORBIDDEN.search(sql)
    if bad:
        return f"the word '{bad.group(0)}' is not allowed."
    cte_names = {m.lower() for m in re.findall(r"\b(\w+)\s+as\s*\(", sql, re.IGNORECASE)}
    for ref in re.findall(r"\b(?:from|join)\s+([\w.\"]+)", sql, re.IGNORECASE):
        name = ref.replace('"', "").split(".")[-1].lower()
        if name not in ALLOWED_TABLES and name not in cte_names:
            return f"the table '{ref}' is not allowed. Only the four mart tables can be used."
    return None


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
                {"title": str(item.get("title") or "Query"), "sql": clean_sql(str(item["sql"]))}
            )
    return plan


def run_sql(sql):
    cursor = get_connection().cursor()
    try:
        cursor.execute(f"select * from (\n{sql}\n) limit {MAX_ROWS}")
        rows = cursor.fetchall()
        columns = [col[0].lower() for col in cursor.description]
    finally:
        cursor.close()
    df = pd.DataFrame(rows, columns=columns)
    for col in df.columns:
        non_null = df[col].dropna()
        if len(non_null) and isinstance(non_null.iloc[0], decimal.Decimal):
            df[col] = df[col].astype(float)
    return df


def write_analysis(question, results):
    parts = [f"Question: {question}"]
    for item in results:
        data_text = item["df"].head(ROWS_SENT_TO_GEMINI).to_csv(index=False)[:6000]
        parts.append(f"Data: {item['title']}\n{data_text}")
    return ask_gemini("\n\n".join(parts), ANALYST_PROMPT, temperature=0.3)


# ---------- Page ----------
st.title("💬 Ask the data")
st.caption(
    "Ask in plain English. Gemini writes the SQL and the app runs it on your marts. "
    "Data only: just your question and the table descriptions go to Google. "
    "Insights and strategy: up to 30 rows of each result also go to Google so it can analyse them. "
    "The marts hold no personal data, and this is synthetic sample data."
)

mode = st.radio("Answer style", ["Insights and strategy", "Data table only"], horizontal=True)
insights = mode == "Insights and strategy"

if "history" not in st.session_state:
    st.session_state.history = []

examples = [
    "Which 5 restaurants have the highest average rating?",
    "How can we improve our lowest-rated restaurants?",
    "What menu strategy would raise revenue?",
]
columns = st.columns(len(examples))
clicked = None
for col, example in zip(columns, examples):
    if col.button(example, use_container_width=True):
        clicked = example

typed = st.chat_input("Ask a question or ask for a strategy...")
question = typed or clicked

if question:
    entry = {"question": question, "insights": insights, "results": [], "analysis": None, "error": None}
    with st.spinner("Working on it..."):
        try:
            plan = make_plan(question, 3 if insights else 1)
            if not plan:
                entry["error"] = "These tables can't answer that. Try asking about sales, menu items, inventory or reviews."
            for step in plan:
                item = {"title": step["title"], "sql": step["sql"], "df": None, "error": None}
                problem = check_sql(step["sql"])
                if problem:
                    item["error"] = f"Blocked for safety: {problem}"
                else:
                    try:
                        item["df"] = run_sql(step["sql"])
                    except Exception as exc:
                        item["error"] = f"The query failed: {str(exc)[:200]}"
                entry["results"].append(item)
            usable = [r for r in entry["results"] if r["df"] is not None and not r["df"].empty]
            if insights and usable:
                entry["analysis"] = write_analysis(question, usable)
        except Exception as exc:
            entry["error"] = f"Something went wrong: {str(exc)[:300]}"
    st.session_state.history.append(entry)

if not st.session_state.history:
    st.info("Pick an example above or type your own question at the bottom.")

for item in reversed(st.session_state.history):
    st.markdown(f"**🧑 {item['question']}**")
    if item["error"]:
        st.error(item["error"])
    if item["analysis"]:
        st.markdown(item["analysis"])
    for result in item["results"]:
        with st.expander(f"📊 {result['title']}", expanded=not item["insights"]):
            if result["error"]:
                st.error(result["error"])
            elif result["df"] is not None:
                df = result["df"]
                if df.empty:
                    st.warning("The query ran but returned no rows.")
                else:
                    st.dataframe(df, hide_index=True)
                    if (
                        len(df.columns) == 2
                        and len(df) > 1
                        and pd.api.types.is_numeric_dtype(df.iloc[:, 1])
                    ):
                        st.bar_chart(df.set_index(df.columns[0]))
            st.caption("SQL used:")
            st.code(result["sql"], language="sql")
    st.divider()