select
    id as supplier_category_id,
    name as supplier_category_name
from {{ source('restaurant_raw', 'supplier_categories') }}
