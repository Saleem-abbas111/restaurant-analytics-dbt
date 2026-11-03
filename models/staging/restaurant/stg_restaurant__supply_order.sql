select
    id as supply_order_id,
    order_date,
    supplier_id,
    total_amount
from {{ source('restaurant_raw', 'supply_orders') }}
