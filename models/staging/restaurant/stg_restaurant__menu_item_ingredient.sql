select
    id as menu_item_ingredient_id,
    ingredient_id,
    menu_item_id,
    quantity_required
from {{ source('restaurant_raw', 'menu_item_ingredients') }}
