select
    id as payment_method_id,
    name as payment_method_name
from {{ source('restaurant_raw', 'payment_methods') }}
