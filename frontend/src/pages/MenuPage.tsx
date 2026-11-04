
import { useEffect, useMemo, useState } from "react"
import {
  ChartNoAxesCombined,
  Sparkles,
  Star,
  UtensilsCrossed,
} from "lucide-react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import { money } from "@/lib/format"
import { apiGet } from "@/lib/api"
import { MetricCard } from "@/components/ui/MetricCard"
import {
  SortableTable,
  type MenuTableRow,
} from "@/components/ui/SortableTable"
import { SearchField } from "@/components/ui/SearchField"

type MenuApiResponse = {
  filters: {
    restaurant_id: number | null
    limit: number
  }
  summary: {
    total_menu_items: number
    total_units_sold: number
    total_revenue: number
    restaurant_count: number
  }
  category_performance: {
    category: string
    menu_items: number
    units_sold: number
    revenue: number
  }[]
  menu_items: MenuTableRow[]
}

type MenuPageProps = {
  restaurantId: string
  range: string
  refreshKey: number
}

const categoryColors = [
  "#f97316",
  "#ff9b76",
  "#ffc6b1",
  "#5a6675",
  "#9ca3af",
]

export function MenuPage({
  restaurantId,
  range,
  refreshKey,
}: MenuPageProps) {
  const [search, setSearch] = useState("")
  const [data, setData] = useState<MenuApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadMenu() {
      setLoading(true)
      setError("")

      try {
        const result = await apiGet<MenuApiResponse>("/api/menu", {
          restaurant_id: restaurantId || undefined,
          limit: 100,
        })

        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load menu performance data.",
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMenu()

    return () => {
      cancelled = true
    }
  }, [restaurantId, refreshKey])

  const categoryData = useMemo(() => {
    const categories = data?.category_performance ?? []

    const totalRevenue = categories.reduce(
      (sum, category) => sum + category.revenue,
      0,
    )

    return categories.map((category) => ({
      ...category,
      share:
        totalRevenue > 0
          ? (category.revenue / totalRevenue) * 100
          : 0,
    }))
  }, [data])

  const topItem = useMemo(() => {
    const items = data?.menu_items ?? []

    return [...items].sort(
      (a, b) => b.revenue - a.revenue,
    )[0]
  }, [data])

  const topItemShare =
    data && data.summary.total_revenue > 0 && topItem
      ? (topItem.revenue / data.summary.total_revenue) * 100
      : 0

  return (
    <div className="page-stack">
      {error && (
        <section className="panel">
          <h2>Could not load menu data</h2>
          <p>{error}</p>
        </section>
      )}

      <section className="metric-grid metric-grid-4">
        <MetricCard
          label="Menu Revenue"
          value={
            loading
              ? "…"
              : money(data?.summary.total_revenue ?? 0)
          }
          icon={ChartNoAxesCombined}
        />

        <MetricCard
          label="Units Sold"
          value={
            loading
              ? "…"
              : (data?.summary.total_units_sold ?? 0).toLocaleString()
          }
          icon={UtensilsCrossed}
        />

        <MetricCard
          label="Menu Items"
          value={
            loading
              ? "…"
              : (data?.summary.total_menu_items ?? 0).toLocaleString()
          }
          icon={Star}
        />

        <MetricCard
          label="Top Item Revenue"
          value={
            loading
              ? "…"
              : money(topItem?.revenue ?? 0)
          }
          icon={Sparkles}
        />
      </section>

      <div className="two-up">
        <section className="panel donut-panel">
          <h2>Revenue by Category</h2>

          <div className="donut-content">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="revenue"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {categoryData.map((category, index) => (
                    <Cell
                      key={category.category}
                      fill={
                        categoryColors[index % categoryColors.length]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) => money(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="category-list">
              {categoryData.map((category, index) => (
                <span key={category.category}>
                  <i
                    style={{
                      background:
                        categoryColors[index % categoryColors.length],
                    }}
                  />
                  {category.category}
                  <b>{category.share.toFixed(1)}%</b>
                </span>
              ))}

              {!loading && categoryData.length === 0 && (
                <span>No category data available.</span>
              )}
            </div>
          </div>
        </section>

        <section className="panel insight-card">
          <span className="ai-badge">
            <Sparkles size={16} /> DATA INSIGHT
          </span>

          <h2>
            {topItem
              ? `Top item: ${topItem.name}`
              : "Top menu item"}
          </h2>

          <p>
            {loading
              ? "Loading menu performance..."
              : topItem
                ? `${topItem.name} generated ${money(
                    topItem.revenue,
                  )} in revenue from ${topItem.units_sold.toLocaleString()} units sold. It represents ${topItemShare.toFixed(
                    1,
                  )}% of total menu revenue in the selected restaurant scope.`
                : "No menu item performance data is available."}
          </p>
        </section>
      </div>

      <section className="panel data-panel">
        <div className="table-head">
          <div>
            <h2>Item Performance</h2>
            <p>
              Sales volume, order count, price, and revenue by menu item
            </p>
          </div>

          <SearchField
            value={search}
            onChange={setSearch}
          />
        </div>

        {loading ? (
          <p>Loading menu performance data…</p>
        ) : error ? (
          <p>Menu data could not be displayed.</p>
        ) : (
          <SortableTable
            type="menu"
            search={search}
            menuRows={data?.menu_items ?? []}
          />
        )}
      </section>
    </div>
  )
}
