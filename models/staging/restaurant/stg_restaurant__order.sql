select
    id as order_id,
    customer_id,
    employee_id,
    order_time,
    status,
    table_id,
    total_amount
from {{ source('restaurant_raw', 'orders') }}
