select
    id as ingredient_category_id,
    name as ingredient_category_name
from {{ source('restaurant_raw', 'ingredient_categories') }}
