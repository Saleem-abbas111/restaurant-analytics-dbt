with orders as (
    select
        order_id,
        table_id,
        status,
        cast(order_time as date) as order_date,
        total_amount
    from {{ ref('stg_restaurant__order') }}
    where upper(status) not in ('CANCELLED', 'CANCELED')
),

dining_tables as (
    select
        dining_table_id,
        restaurant_id
    from {{ ref('stg_restaurant__dining_table') }}
),

items_per_order as (
    select
        order_id,
        sum(quantity) as items_sold
    from {{ ref('stg_restaurant__order_item') }}
    group by order_id
),

payments_per_order as (
    select
        order_id,
        sum(amount) as payments_recorded
    from {{ ref('stg_restaurant__payment') }}
    group by order_id
)

select
    dining_tables.restaurant_id || '-' || orders.order_date as daily_sales_key,
    dining_tables.restaurant_id,
    orders.order_date,
    count(distinct orders.order_id) as order_count,
    coalesce(sum(items_per_order.items_sold), 0) as items_sold,
    coalesce(sum(orders.total_amount), 0) as sales_all_open_and_completed,
    coalesce(sum(case when orders.status = 'completed' then orders.total_amount end), 0) as completed_sales,
    coalesce(sum(payments_per_order.payments_recorded), 0) as payments_recorded
from orders
left join dining_tables
    on orders.table_id = dining_tables.dining_table_id
left join items_per_order
    on orders.order_id = items_per_order.order_id
left join payments_per_order
    on orders.order_id = payments_per_order.order_id
group by 1, 2, 3