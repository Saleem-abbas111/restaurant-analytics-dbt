select
    id as ingredient_id,
    category_id,
    name as ingredient_name,
    unit
from {{ source('restaurant_raw', 'ingredients') }}
