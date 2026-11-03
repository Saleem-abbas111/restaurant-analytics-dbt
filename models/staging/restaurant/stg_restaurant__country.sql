select
    id as country_id,
    code,
    name as country_name
from {{ source('restaurant_raw', 'countries') }}
