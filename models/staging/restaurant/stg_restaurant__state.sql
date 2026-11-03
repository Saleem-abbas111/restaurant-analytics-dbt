select
    id as state_id,
    country_id,
    name as state_name
from {{ source('restaurant_raw', 'states') }}
