select
    id as menu_id,
    is_active,
    name as menu_name,
    restaurant_id
from {{ source('restaurant_raw', 'menus') }}
