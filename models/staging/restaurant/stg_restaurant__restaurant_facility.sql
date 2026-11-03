select
    id as restaurant_facility_id,
    facility_id,
    restaurant_id
from {{ source('restaurant_raw', 'restaurant_facilities') }}
