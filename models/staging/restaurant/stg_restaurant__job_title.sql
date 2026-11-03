-- TODO: columns were fixed in Snowflake after this project was generated.
-- Replace * with explicit columns once you've seen them (SELECT * FROM RESTAURANT_DB.PUBLIC.JOB_TITLES LIMIT 5).
select
    id as job_title_id,
    title,
    description
from {{ source('restaurant_raw', 'job_titles') }}
