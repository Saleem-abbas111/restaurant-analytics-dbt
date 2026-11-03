select
    id as payment_id,
    amount,
    order_id,
    payment_method_id,
    payment_time
from {{ source('restaurant_raw', 'payments') }}
