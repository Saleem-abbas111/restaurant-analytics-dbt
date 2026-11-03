select
    id as discount_id,
    code,
    is_active,
    percentage
from {{ source('restaurant_raw', 'discounts') }}
