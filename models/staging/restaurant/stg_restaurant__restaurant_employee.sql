select
    id as restaurant_employee_id,
    employee_id,
    restaurant_id
from {{ source('restaurant_raw', 'restaurant_employees') }}
