# restaurant_analytics (dbt Core)

Layers: raw tables (RESTAURANT_DB.PUBLIC) -> staging views (STAGING) -> marts (MARTS, later).

## Setup
1. `python -m venv .venv` and activate it
2. `pip install -r requirements.txt`
3. Copy `profiles.yml.example` to your `~/.dbt/profiles.yml` and fill in account and user
4. Set the password: PowerShell `$env:SNOWFLAKE_PASSWORD="..."` / Mac, Linux `export SNOWFLAKE_PASSWORD=...`

## Run
```
dbt debug                 # checks the Snowflake connection
dbt run                   # builds 33 staging views in STAGING
dbt test                  # unique + not_null on every primary key
dbt docs generate && dbt docs serve
```

## Notes
- `stg_restaurant__facility`, `__job_title`, `__menu_category` use `select *` because those tables were fixed after generation. Replace with explicit columns.
- Staging keeps personal data (customers, employees, suppliers). Never expose STAGING to Claude; use CURATED or MARTS.
