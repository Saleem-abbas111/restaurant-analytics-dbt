with menu_items as (
    select
        menu_item_id,
        menu_item_name,
        category_id,
        menu_id,
        price
    from {{ ref('stg_restaurant__menu_item') }}
),

menus as (
    select
        menu_id,
        restaurant_id
    from {{ ref('stg_restaurant__menu') }}
),

categories as (
    select
        menu_category_id,
        name as category_name
    from {{ ref('stg_restaurant__menu_category') }}
),

valid_orders as (
    select
        order_id
    from {{ ref('stg_restaurant__order') }}
    where status = 'completed'
),

sales as (
    select
        order_items.menu_item_id,
        count(distinct order_items.order_id) as orders_containing_item,
        sum(order_items.quantity) as units_sold,
        sum(order_items.subtotal) as revenue
    from {{ ref('stg_restaurant__order_item') }} as order_items
    inner join valid_orders
        on order_items.order_id = valid_orders.order_id
    group by order_items.menu_item_id
)

select
    menu_items.menu_item_id,
    menu_items.menu_item_name,
    categories.category_name,
    menus.restaurant_id,
    menu_items.price,
    coalesce(sales.orders_containing_item, 0) as orders_containing_item,
    coalesce(sales.units_sold, 0) as units_sold,
    coalesce(sales.revenue, 0) as revenue
from menu_items
left join menus
    on menu_items.menu_id = menus.menu_id
left join categories
    on menu_items.category_id = categories.menu_category_id
left join sales
    on menu_items.menu_item_id = sales.menu_item_id