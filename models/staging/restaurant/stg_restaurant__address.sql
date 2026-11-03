select
    id as address_id,
    city_id,
    postal_code,
    street
from {{ source('restaurant_raw', 'addresses') }}
