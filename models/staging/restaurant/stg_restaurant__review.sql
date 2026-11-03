select
    id as review_id,
    comment,
    customer_id,
    rating,
    restaurant_id,
    review_date
from {{ source('restaurant_raw', 'reviews') }}
