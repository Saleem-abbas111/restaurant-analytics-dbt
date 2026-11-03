select
    id as order_item_id,
    menu_item_id,
    notes,
    order_id,
    quantity,
    subtotal
from {{ source('restaurant_raw', 'order_items') }}
