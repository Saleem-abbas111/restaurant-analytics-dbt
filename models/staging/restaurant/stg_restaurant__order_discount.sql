select
    id as order_discount_id,
    discount_id,
    order_id
from {{ source('restaurant_raw', 'order_discounts') }}
