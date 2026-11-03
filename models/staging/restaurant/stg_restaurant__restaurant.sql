select
    id as restaurant_id,
    address_id,
    email,
    name as restaurant_name,
    phone
from {{ source('restaurant_raw', 'restaurants') }}
