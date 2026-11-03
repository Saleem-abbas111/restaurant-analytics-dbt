select
    id as city_id,
    name as city_name,
    state_id
from {{ source('restaurant_raw', 'cities') }}
