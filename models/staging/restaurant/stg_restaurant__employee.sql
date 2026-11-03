select
    id as employee_id,
    email,
    first_name,
    hire_date,
    job_title_id,
    last_name,
    phone
from {{ source('restaurant_raw', 'employees') }}
