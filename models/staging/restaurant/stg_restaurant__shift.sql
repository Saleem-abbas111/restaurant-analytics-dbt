select
    id as shift_id,
    end_time,
    name as shift_name,
    start_time
from {{ source('restaurant_raw', 'shifts') }}
