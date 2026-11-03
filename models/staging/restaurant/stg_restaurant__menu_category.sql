-- TODO: columns were fixed in Snowflake after this project was generated.
-- Replace * with explicit columns once you've seen them (SELECT * FROM RESTAURANT_DB.PUBLIC.MENU_CATEGORIES LIMIT 5).
select
    id as menu_category_id,
    name,
    description
from {{ source('restaurant_raw', 'menu_categories') }}
