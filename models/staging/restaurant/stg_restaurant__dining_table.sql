select
    id as dining_table_id,
    capacity,
    num,
    restaurant_id,
    status
from {{ source('restaurant_raw', 'tables') }}
