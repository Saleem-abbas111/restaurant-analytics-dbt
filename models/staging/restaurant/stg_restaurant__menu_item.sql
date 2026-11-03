select
    id as menu_item_id,
    category_id,
    description,
    menu_id,
    name as menu_item_name,
    price
from {{ source('restaurant_raw', 'menu_items') }}
