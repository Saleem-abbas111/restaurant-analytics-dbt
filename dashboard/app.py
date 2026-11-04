import decimal
import html
import os

import altair as alt
import pandas as pd
import snowflake.connector
import streamlit as st

ACCENT = "#FF6B35"
SOFT = "#FFB085"
GRID = "#E6EAF0"

st.set_page_config(page_title="Restaurant Intelligence", page_icon="📊", layout="wide")

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .stApp, .stMarkdown, h1, h2, h3, p, label, [data-testid="stMetric"] {
        font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    }
    .block-container { padding-top: 2rem; max-width: 1400px; }
    h1 { font-weight: 700; letter-spacing: -0.5px; }
    h2, h3 { font-weight: 650; }
    [data-testid="stMetric"] {
        background: #FFFFFF;
        border: 1px solid #E6EAF0;
        border-radius: 14px;
        padding: 16px 18px;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
    }
    [data-testid="stMetricLabel"] p { color: #6B7689; font-size: 0.85rem; }
    [data-testid="stMetricValue"] div {
        font-size: 1.55rem; font-weight: 700;
        overflow: visible; text-overflow: clip;
    }
    [data-testid="stVerticalBlockBorderWrapper"] {
        border-radius: 14px; background: #FFFFFF;
    }
    .badge-line {
        border: 1px dashed #CBD3E0; border-radius: 10px; background: #FFFFFF;
        padding: 8px 14px; margin: 6px 0 18px 0; color: #3A465C; font-size: 0.85rem;
    }
    .rank-row { display: flex; align-items: center; gap: 12px; margin: 10px 0; }
    .rank-num {
        width: 26px; height: 26px; border-radius: 8px; background: #EEF1F6;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.8rem; font-weight: 600; flex-shrink: 0;
    }
    .rank-row:first-child .rank-num { background: #0F1B33; color: #FFFFFF; }
    .rank-name { width: 34%; font-size: 0.9rem; line-height: 1.2; }
    .rank-track { flex: 1; height: 10px; background: #EEF1F6; border-radius: 99px; overflow: hidden; }
    .rank-fill { height: 100%; background: #FF6B35; border-radius: 99px; }
    .rank-val { width: 90px; text-align: right; font-weight: 600; font-size: 0.9rem; }
    .highlight { font-size: 0.92rem; color: #3A465C; line-height: 1.45; }
    #MainMenu, footer { visibility: hidden; }
    </style>
    """,
    unsafe_allow_html=True,
)


def style(chart):
    return (
        chart.configure_view(strokeWidth=0)
        .configure_axis(gridColor=GRID, domainColor=GRID, tickColor=GRID, labelColor="#6B7689", titleColor="#6B7689")
    )


# ---------- Connection and data loading ----------
@st.cache_resource
def get_connection():
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"].strip(),
        user=os.environ["SNOWFLAKE_USER"].strip(),
        password=os.environ["SNOWFLAKE_PASSWORD"].strip(),
        role="RESTAURANT_DBT_ROLE",
        warehouse="RESTAURANT_COMPUTE_WH",
        database="RESTAURANT_DB",
        schema="MARTS",
    )


@st.cache_data(ttl=600, show_spinner="Loading data from Snowflake...")
def run_query(sql):
    cursor = get_connection().cursor()
    try:
        cursor.execute(sql)
        rows = cursor.fetchall()
        columns = [col[0].lower() for col in cursor.description]
    finally:
        cursor.close()
    df = pd.DataFrame(rows, columns=columns)
    for col in df.columns:
        non_null = df[col].dropna()
        if len(non_null) and isinstance(non_null.iloc[0], decimal.Decimal):
            df[col] = df[col].astype(float)
    return df


sales = run_query("select * from fct_daily_sales")
sales["order_date"] = pd.to_datetime(sales["order_date"])
menu = run_query("select * from fct_menu_item_performance")
inventory = run_query("select * from fct_inventory")
reviews = run_query("select * from fct_restaurant_reviews")

# ---------- Sidebar ----------
st.sidebar.markdown("### 📊 Restaurant Intelligence")
st.sidebar.markdown("**Filters**")

names = reviews[["restaurant_id", "restaurant_name"]].copy()
duplicated = names["restaurant_name"].duplicated(keep=False)
id_text = names["restaurant_id"].astype("int64").astype(str)
names["label"] = names["restaurant_name"].where(
    ~duplicated, names["restaurant_name"] + " #" + id_text
)
label_to_id = dict(zip(names["label"], names["restaurant_id"]))

chosen = st.sidebar.multiselect(
    "Restaurants", sorted(label_to_id), placeholder="All restaurants"
)
selected_ids = [label_to_id[c] for c in chosen] if chosen else list(label_to_id.values())

min_day = sales["order_date"].min().date()
max_day = sales["order_date"].max().date()
date_range = st.sidebar.date_input(
    "Order dates", value=(min_day, max_day), min_value=min_day, max_value=max_day
)
if isinstance(date_range, tuple) and len(date_range) == 2:
    start_day, end_day = date_range
else:
    start_day, end_day = min_day, max_day

basis = st.sidebar.radio("Sales to show", ["Completed orders only", "All except cancelled"])
sales_col = "completed_sales" if basis.startswith("Completed") else "sales_all_open_and_completed"

if st.sidebar.button("🔄 Refresh data"):
    st.cache_data.clear()
    st.rerun()

st.sidebar.caption("Leave Restaurants empty to include all of them.")

# ---------- Apply filters ----------
label_lookup = names[["restaurant_id", "label"]].rename(columns={"label": "restaurant"})
f_sales = sales[
    sales["restaurant_id"].isin(selected_ids)
    & sales["order_date"].dt.date.between(start_day, end_day)
].merge(label_lookup, on="restaurant_id", how="left")
f_menu = menu[menu["restaurant_id"].isin(selected_ids)]
f_inv = inventory[inventory["restaurant_id"].isin(selected_ids)]
f_rev = reviews[reviews["restaurant_id"].isin(selected_ids)]

# ---------- Header ----------
st.title("Restaurant Overview")
st.caption("Monitor performance across your restaurant portfolio.")
st.markdown(
    f'<div class="badge-line"><b>Live Snowflake connection · Synthetic dataset</b> '
    f"&nbsp;|&nbsp; {len(selected_ids)} restaurant(s) &nbsp;|&nbsp; {start_day} to {end_day} "
    f"&nbsp;|&nbsp; {html.escape(basis)}</div>",
    unsafe_allow_html=True,
)

tab_overview, tab_menu, tab_inventory, tab_reviews = st.tabs(
    ["📈 Overview", "🍔 Menu", "📦 Inventory", "⭐ Reviews"]
)

# ---------- Overview ----------
with tab_overview:
    total_sales = f_sales[sales_col].sum()
    total_orders = int(f_sales["order_count"].sum())
    total_items = int(f_sales["items_sold"].sum())
    avg_order = total_sales / total_orders if total_orders else 0
    review_total = f_rev["review_count"].sum()
    avg_rating = (
        (f_rev["average_rating"].fillna(0) * f_rev["review_count"]).sum() / review_total
        if review_total
        else 0
    )

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Sales", f"{total_sales:,.2f}")
    c2.metric("Total Orders", f"{total_orders:,}")
    c3.metric("Items Sold", f"{total_items:,}")
    c4.metric("Average Order Value", f"{avg_order:,.2f}")
    c5.metric("Average Customer Rating", f"{avg_rating:.2f} / 5")

    daily = f_sales.groupby("order_date", as_index=False).agg(
        sales=(sales_col, "sum"), orders=("order_count", "sum")
    )

    if daily.empty:
        st.info("No sales match the current filters.")
    else:
        with st.container(border=True):
            head_left, head_right = st.columns([3, 1])
            head_left.subheader("Sales Performance")
            measure = head_right.radio(
                "Measure", ["Sales", "Orders"], horizontal=True, label_visibility="collapsed"
            )
            field = "sales" if measure == "Sales" else "orders"
            area = (
                alt.Chart(daily)
                .mark_area(
                    color=ACCENT,
                    opacity=0.25,
                    interpolate="monotone",
                    line={"color": ACCENT, "strokeWidth": 2},
                )
                .encode(
                    x=alt.X("order_date:T", title=None),
                    y=alt.Y(f"{field}:Q", title=measure),
                    tooltip=[
                        alt.Tooltip("order_date:T", title="Date"),
                        alt.Tooltip("sales:Q", title="Sales", format=",.2f"),
                        alt.Tooltip("orders:Q", title="Orders"),
                    ],
                )
            )
            st.altair_chart(style(area))

        by_restaurant = (
            f_sales.groupby("restaurant", as_index=False)[sales_col]
            .sum()
            .rename(columns={sales_col: "sales"})
            .sort_values("sales", ascending=False)
            .head(10)
        )
        weekday_order = [
            "Monday", "Tuesday", "Wednesday", "Thursday",
            "Friday", "Saturday", "Sunday",
        ]
        by_weekday = (
            daily.assign(weekday=daily["order_date"].dt.day_name())
            .groupby("weekday", as_index=False)["sales"]
            .sum()
        )

        left, right = st.columns(2)
        with left:
            with st.container(border=True):
                st.subheader("Top Performing Restaurants")
                top_value = float(by_restaurant["sales"].max()) or 1.0
                rows = ""
                for rank, (name, value) in enumerate(
                    zip(by_restaurant["restaurant"], by_restaurant["sales"]), start=1
                ):
                    width = max(float(value) / top_value * 100, 1)
                    rows += (
                        f'<div class="rank-row"><span class="rank-num">{rank}</span>'
                        f'<span class="rank-name">{html.escape(str(name))}</span>'
                        f'<div class="rank-track"><div class="rank-fill" style="width:{width:.1f}%"></div></div>'
                        f'<span class="rank-val">{float(value):,.2f}</span></div>'
                    )
                st.markdown(rows, unsafe_allow_html=True)
        with right:
            with st.container(border=True):
                st.subheader("Sales by Weekday")
                weekday_chart = (
                    alt.Chart(by_weekday)
                    .mark_bar(color=ACCENT, cornerRadiusEnd=4)
                    .encode(
                        x=alt.X("weekday:N", sort=weekday_order, title=None),
                        y=alt.Y("sales:Q", title="Sales"),
                        tooltip=["weekday", alt.Tooltip("sales:Q", format=",.2f")],
                    )
                )
                st.altair_chart(style(weekday_chart))

        with st.container(border=True):
            st.subheader("Performance Highlights")
            best_day = by_weekday.sort_values("sales", ascending=False).iloc[0]
            all_sales = f_sales["sales_all_open_and_completed"].sum()
            share = (f_sales["completed_sales"].sum() / all_sales * 100) if all_sales else 0
            active = f_sales["restaurant_id"].nunique()
            h1, h2, h3 = st.columns(3)
            h1.markdown(
                f'<div class="highlight">📈 <b>{best_day["weekday"]}</b> has the highest weekday '
                f'sales at {best_day["sales"]:,.2f}.</div>',
                unsafe_allow_html=True,
            )
            h2.markdown(
                f'<div class="highlight">📊 Completed sales account for <b>{share:.1f}%</b> '
                f"of total recorded sales.</div>",
                unsafe_allow_html=True,
            )
            h3.markdown(
                f'<div class="highlight">📦 The selection covers <b>{active} restaurants</b> '
                f"from {start_day} to {end_day}.</div>",
                unsafe_allow_html=True,
            )

# ---------- Menu ----------
with tab_menu:
    categories = sorted(f_menu["category_name"].dropna().unique())
    picked = st.multiselect("Categories", categories, placeholder="All categories")
    menu_view = f_menu[f_menu["category_name"].isin(picked)] if picked else f_menu
    top_n = st.slider("Number of items to show", 5, 30, 10)

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Menu items", f"{len(menu_view):,}")
    m2.metric("Sold at least once", f"{int((menu_view['units_sold'] > 0).sum()):,}")
    m3.metric("Never sold", f"{int((menu_view['units_sold'] == 0).sum()):,}")
    m4.metric("Revenue (completed orders)", f"{menu_view['revenue'].sum():,.2f}")

    left, right = st.columns(2)
    with left:
        with st.container(border=True):
            st.subheader("Revenue by category")
            by_category = menu_view.groupby("category_name", as_index=False)["revenue"].sum()
            cat_chart = (
                alt.Chart(by_category)
                .mark_bar(color=ACCENT, cornerRadiusEnd=4)
                .encode(
                    x=alt.X("revenue:Q", title="Revenue"),
                    y=alt.Y("category_name:N", sort="-x", title=None),
                    tooltip=["category_name", alt.Tooltip("revenue:Q", format=",.2f")],
                )
            )
            st.altair_chart(style(cat_chart))
    with right:
        with st.container(border=True):
            st.subheader(f"Top {top_n} items by revenue")
            top_items = menu_view.nlargest(top_n, "revenue")
            item_chart = (
                alt.Chart(top_items)
                .mark_bar(color=SOFT, cornerRadiusEnd=4)
                .encode(
                    x=alt.X("revenue:Q", title="Revenue"),
                    y=alt.Y("menu_item_name:N", sort="-x", title=None),
                    tooltip=["menu_item_name", "category_name", alt.Tooltip("revenue:Q", format=",.2f")],
                )
            )
            st.altair_chart(style(item_chart))

    st.subheader("All menu items")
    table = menu_view[
        ["menu_item_name", "category_name", "price", "units_sold", "revenue"]
    ].sort_values("revenue", ascending=False)
    st.dataframe(
        table,
        hide_index=True,
        column_config={
            "menu_item_name": "Item",
            "category_name": "Category",
            "price": st.column_config.NumberColumn("Price", format="%.2f"),
            "units_sold": "Units sold",
            "revenue": st.column_config.ProgressColumn(
                "Revenue",
                format="%.2f",
                min_value=0.0,
                max_value=float(max(table["revenue"].max(), 1)),
            ),
        },
    )
    st.download_button("⬇️ Download CSV", table.to_csv(index=False), "menu_items.csv", "text/csv")

# ---------- Inventory ----------
with tab_inventory:
    if f_inv.empty:
        st.info("No inventory records for the selected restaurants.")
    else:
        max_qty = float(f_inv["quantity_on_hand"].max())
        default_threshold = float(f_inv["quantity_on_hand"].quantile(0.1))
        threshold = st.slider(
            "Low-stock threshold (quantity on hand)",
            min_value=0.0,
            max_value=max_qty,
            value=min(default_threshold, max_qty),
        )
        search = st.text_input("Search ingredient", placeholder="e.g. tomato")

        inv_view = f_inv
        if search:
            inv_view = inv_view[
                inv_view["ingredient_name"].str.contains(search, case=False, na=False)
            ]
        low = inv_view[inv_view["quantity_on_hand"] <= threshold].sort_values("quantity_on_hand")

        i1, i2, i3, i4 = st.columns(4)
        i1.metric("Stock records", f"{len(inv_view):,}")
        i2.metric("Distinct ingredients", f"{inv_view['ingredient_id'].nunique():,}")
        i3.metric("Low-stock records", f"{len(low):,}")
        i4.metric(
            "Share low stock",
            f"{(len(low) / len(inv_view) * 100) if len(inv_view) else 0:.0f}%",
        )

        left, right = st.columns(2)
        with left:
            with st.container(border=True):
                st.subheader("Average quantity by category")
                by_cat = inv_view.groupby("ingredient_category_name", as_index=False)[
                    "quantity_on_hand"
                ].mean()
                inv_chart = (
                    alt.Chart(by_cat)
                    .mark_bar(color=ACCENT, cornerRadiusEnd=4)
                    .encode(
                        x=alt.X("quantity_on_hand:Q", title="Average quantity"),
                        y=alt.Y("ingredient_category_name:N", sort="-x", title=None),
                        tooltip=[
                            "ingredient_category_name",
                            alt.Tooltip("quantity_on_hand:Q", format=",.1f"),
                        ],
                    )
                )
                st.altair_chart(style(inv_chart))
        with right:
            with st.container(border=True):
                st.subheader("Quantity distribution")
                hist = (
                    alt.Chart(inv_view)
                    .mark_bar(color=SOFT)
                    .encode(
                        x=alt.X("quantity_on_hand:Q", bin=alt.Bin(maxbins=20), title="Quantity on hand"),
                        y=alt.Y("count():Q", title="Records"),
                    )
                )
                st.altair_chart(style(hist))

        st.subheader("⚠️ Low-stock items")
        st.caption("Ingredients use different units, so compare quantities with care.")
        st.dataframe(
            low[
                [
                    "restaurant_name",
                    "ingredient_name",
                    "ingredient_category_name",
                    "quantity_on_hand",
                    "unit",
                ]
            ],
            hide_index=True,
            column_config={
                "restaurant_name": "Restaurant",
                "ingredient_name": "Ingredient",
                "ingredient_category_name": "Category",
                "quantity_on_hand": "Quantity",
                "unit": "Unit",
            },
        )
        st.download_button(
            "⬇️ Download low-stock CSV", low.to_csv(index=False), "low_stock.csv", "text/csv"
        )

# ---------- Reviews ----------
with tab_reviews:
    max_reviews = int(f_rev["review_count"].max()) if len(f_rev) else 1
    min_reviews = st.slider("Minimum number of reviews", 1, max(max_reviews, 1), 1)
    rated = f_rev[f_rev["review_count"] >= min_reviews].dropna(subset=["average_rating"])

    if rated.empty:
        st.info("No restaurants match the current filters.")
    else:
        r1, r2, r3 = st.columns(3)
        r1.metric("Restaurants with reviews", f"{len(rated):,}")
        r2.metric("Total reviews", f"{int(rated['review_count'].sum()):,}")
        r3.metric(
            "Average rating",
            f"{(rated['average_rating'] * rated['review_count']).sum() / rated['review_count'].sum():.2f}",
        )

        with st.container(border=True):
            st.subheader("How restaurant ratings are spread")
            spread = (
                alt.Chart(rated)
                .mark_bar(color=ACCENT, cornerRadiusEnd=4)
                .encode(
                    x=alt.X("average_rating:Q", bin=alt.Bin(maxbins=10), title="Average rating"),
                    y=alt.Y("count():Q", title="Restaurants"),
                )
            )
            st.altair_chart(style(spread))

        rating_config = {
            "restaurant_name": "Restaurant",
            "review_count": "Reviews",
            "average_rating": st.column_config.ProgressColumn(
                "Avg rating",
                format="%.2f",
                min_value=0.0,
                max_value=float(max(5.0, rated["highest_rating"].max())),
            ),
        }
        cols = ["restaurant_name", "review_count", "average_rating"]
        left, right = st.columns(2)
        with left:
            st.subheader("🏆 Best rated")
            st.dataframe(
                rated.sort_values("average_rating", ascending=False).head(10)[cols],
                hide_index=True,
                column_config=rating_config,
            )
        with right:
            st.subheader("📉 Needs attention")
            st.dataframe(
                rated.sort_values("average_rating").head(10)[cols],
                hide_index=True,
                column_config=rating_config,
            )