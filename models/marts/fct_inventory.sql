with inventory as (
    select
        inventory_id,
        ingredient_id,
        restaurant_id,
        quantity
    from {{ ref('stg_restaurant__inventory') }}
),

ingredients as (
    select
        ingredient_id,
        category_id,
        ingredient_name,
        unit
    from {{ ref('stg_restaurant__ingredient') }}
),

categories as (
    select
        ingredient_category_id,
        ingredient_category_name
    from {{ ref('stg_restaurant__ingredient_category') }}
),

restaurants as (
    select
        restaurant_id,
        restaurant_name
    from {{ ref('stg_restaurant__restaurant') }}
)

select
    inventory.inventory_id,
    inventory.restaurant_id,
    restaurants.restaurant_name,
    inventory.ingredient_id,
    ingredients.ingredient_name,
    categories.ingredient_category_name,
    ingredients.unit,
    inventory.quantity as quantity_on_hand
from inventory
left join ingredients
    on inventory.ingredient_id = ingredients.ingredient_id
left join categories
    on ingredients.category_id = categories.ingredient_category_id
left join restaurants
    on inventory.restaurant_id = restaurants.restaurant_id