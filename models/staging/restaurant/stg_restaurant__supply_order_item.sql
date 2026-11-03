select
    id as supply_order_item_id,
    ingredient_id,
    quantity,
    supply_order_id,
    unit_price
from {{ source('restaurant_raw', 'supply_order_items') }}
