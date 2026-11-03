with reviews as (
    select
        review_id,
        restaurant_id,
        rating,
        review_date
    from {{ ref('stg_restaurant__review') }}
),

restaurants as (
    select
        restaurant_id,
        restaurant_name
    from {{ ref('stg_restaurant__restaurant') }}
)

select
    restaurants.restaurant_id,
    restaurants.restaurant_name,
    count(reviews.review_id) as review_count,
    round(avg(reviews.rating), 2) as average_rating,
    min(reviews.rating) as lowest_rating,
    max(reviews.rating) as highest_rating,
    min(reviews.review_date) as first_review_date,
    max(reviews.review_date) as latest_review_date
from restaurants
left join reviews
    on restaurants.restaurant_id = reviews.restaurant_id
group by restaurants.restaurant_id, restaurants.restaurant_name