select
    id as inventory_id,
    ingredient_id,
    quantity,
    restaurant_id
from {{ source('restaurant_raw', 'inventories') }}
