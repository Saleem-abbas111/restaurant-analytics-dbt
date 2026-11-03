
select
    id as facility_id,
    name,
    description
from {{ source('restaurant_raw', 'facilities') }}
