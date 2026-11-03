select
    id as supplier_id,
    address_id,
    category_id,
    contact_name,
    email,
    name as supplier_name,
    phone
from {{ source('restaurant_raw', 'suppliers') }}
