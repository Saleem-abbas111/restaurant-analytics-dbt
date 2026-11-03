select
    id as reservation_id,
    customer_id,
    party_size,
    reservation_time,
    table_id
from {{ source('restaurant_raw', 'reservations') }}
