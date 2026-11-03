# Restaurant Analytics: Snowflake, dbt and Streamlit

An end-to-end analytics project on synthetic restaurant data. Raw tables in Snowflake are cleaned and summarised with dbt, then explored in a Streamlit dashboard that also includes an AI "Ask the data" page powered by Google Gemini.

> The data is synthetic sample data (small, uniform tables). Treat all numbers as a demo, not real business results.

## Architecture

```
33 CSV files -> Snowflake RESTAURANT_DB.PUBLIC (raw)
             -> dbt staging views  (RESTAURANT_DB.STAGING, 33 models)
             -> dbt mart tables    (RESTAURANT_DB.MARTS, 4 models)
             -> Streamlit dashboard + Ask the Data (Gemini)
```

## What is in the marts

| Mart | One row is | Answers |
|---|---|---|
| `fct_daily_sales` | one restaurant on one day | How much does each restaurant sell per day? |
| `fct_menu_item_performance` | one menu item | Which dishes sell best? |
| `fct_inventory` | one stock record | What is in stock at each restaurant? |
| `fct_restaurant_reviews` | one restaurant | How is each restaurant rated? |

Personal data (emails, phones, customer names, review comments) is left out of the marts.

## Dashboard

- **Main page:** KPIs, sales trend, top restaurants, menu performance, inventory with a low-stock alert, and review rankings. Sidebar filters for restaurant, date range and sales basis.
- **Ask the Data:** type a question in plain English. Gemini writes SQL, the app runs it on the marts, and in "Insights and strategy" mode Gemini turns the results into findings and recommended actions. Queries pass a safety check first (single SELECT, mart tables only, row cap, timeout).

<!-- Add screenshots here, for example: ![Overview](docs/overview.png) -->

## Data quality

dbt runs 77 tests (`unique` and `not_null` on every ID, plus accepted values for order status). The sample data has known quirks, for example cancelled orders that have payments, so `completed_sales` is used as the revenue measure.

## Setup

1. Create and activate a virtual environment, then install packages:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```
2. Copy `profiles.yml.example` to `profiles.yml` and fill in your Snowflake account and user. Never commit `profiles.yml`.
3. Set credentials for the terminal session (they are never stored in files):
   ```powershell
   $env:DBT_PROFILES_DIR = "."
   $env:SNOWFLAKE_ACCOUNT = '<account-id>'
   $env:SNOWFLAKE_USER = '<username>'
   $env:SNOWFLAKE_PASSWORD = '<password>'
   $env:GEMINI_API_KEY = '<gemini-api-key>'
   ```
4. Build and test the models:
   ```powershell
   dbt debug
   dbt run
   dbt test
   ```
5. Start the dashboard:
   ```powershell
   python -m streamlit run dashboard\app.py
   ```

The Snowflake setup scripts (roles, curated views, OAuth and MCP) are in `snowflake_sql/`, if present in your copy of the project.

## Tech stack

Snowflake, dbt Core, Python, Streamlit, Altair, Google Gemini API (free tier).

## Project notes

See `PROJECT_STATUS.md` for the full project history, decisions, conventions and open items.