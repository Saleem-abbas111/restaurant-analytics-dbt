select
    id as customer_id,
    email,
    first_name,
    last_name,
    phone
from {{ source('restaurant_raw', 'customers') }}
