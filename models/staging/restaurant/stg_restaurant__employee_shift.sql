select
    id as employee_shift_id,
    employee_id,
    shift_date,
    shift_id
from {{ source('restaurant_raw', 'employee_shifts') }}
