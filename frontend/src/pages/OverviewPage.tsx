import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  Box,
  ChartNoAxesCombined,
  FileText,
  Package,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { orange } from "@/lib/format"
import { apiGet } from "@/lib/api"
import { MetricCard } from "@/components/ui/MetricCard"
import { ChartTooltip } from "@/components/ui/ChartTooltip"

type OverviewResponse = {
  filters?: {
    start_date: string | null
    end_date: string | null
    restaurant_id: string | null
  }
  summary: {
    total_sales: number
    completed_sales: number
    order_count: number
    items_sold: number
    average_order_value: number
    restaurant_count: number
    period_start: string | null
    period_end: string | null
  }
  daily_sales: {
    date: string
    sales: number
    completed_sales: number
    orders: number
    items_sold: number
  }[]
  weekday_sales: {
    day: string
    sales: number
    orders: number
  }[]
  top_restaurants: {
    restaurant_id: string
    name: string
    sales: number
    completed_sales: number
    orders: number
    average_rating: number | null
  }[]
}

type ReviewsResponse = {
  summary: {
    weighted_average_rating: number | null
  }
}

function formatAmount(value: number, decimals = 2) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Calculates the selected date range relative to the latest date
 * available in the dataset, rather than the current calendar date.
 */
function getDateFilters(range: string, latestDate: string) {
  const end = new Date(`${latestDate}T00:00:00Z`)
  const start = new Date(end)

  if (range === "Last 7 Days") {
    start.setUTCDate(start.getUTCDate() - 6)
  } else if (range === "Last 30 Days") {
    start.setUTCDate(start.getUTCDate() - 29)
  } else if (range === "This Quarter") {
    const quarterStartMonth = Math.floor(end.getUTCMonth() / 3) * 3
    start.setUTCMonth(quarterStartMonth, 1)
  } else if (range === "Year to Date") {
    start.setUTCMonth(0, 1)
  }

  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: latestDate,
  }
}

export function Overview({
  metric,
  setMetric,
  goAnalyst,
  restaurantId,
  range,
  refreshKey,
}: {
  metric: "sales" | "orders"
  setMetric: (v: "sales" | "orders") => void
  goAnalyst: () => void
  restaurantId: string
  range: string
  refreshKey: number
}) {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadOverview() {
      setLoading(true)
      setError("")

      try {
        // Get the latest date in the dataset.
        const baseData = await apiGet<OverviewResponse>("/api/overview")

        if (!active) return

        const latestDate = baseData.summary.period_end

        if (!latestDate) {
          throw new Error("The dataset does not contain a valid date range.")
        }

        // Calculate selected dates relative to the latest dataset date.
        const dateFilters = getDateFilters(range, latestDate)

        // Fetch overview data using the selected filters.
        const result = await apiGet<OverviewResponse>("/api/overview", {
          ...dateFilters,
          restaurant_id: restaurantId || undefined,
        })

        if (active) {
          setData(result)
          setError("")
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load overview data."
          )
          setData(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }

      // Rating is currently an overall rating, not filtered by
      // the selected restaurant or date range.
      try {
        const reviews = await apiGet<ReviewsResponse>("/api/reviews")

        if (active) {
          setAverageRating(reviews.summary.weighted_average_rating)
        }
      } catch {
        if (active) {
          setAverageRating(null)
        }
      }
    }

    loadOverview()

    return () => {
      active = false
    }
  }, [restaurantId, range, refreshKey])

  const chartData = useMemo(() => {
    return (data?.daily_sales ?? []).map((item) => ({
      date: item.date,
      sales: item.sales,
      orders: item.orders,
    }))
  }, [data])

  const bestWeekday = useMemo(() => {
    if (!data?.weekday_sales.length) return null

    return [...data.weekday_sales].sort(
      (a, b) => b.sales - a.sales
    )[0]
  }, [data])

  const completedSalesShare =
    data && data.summary.total_sales > 0
      ? (data.summary.completed_sales / data.summary.total_sales) * 100
      : null

  if (loading) {
    return (
      <div className="page-stack">
        <section className="panel">
          <p>Loading live restaurant data from Snowflake...</p>
        </section>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>Unable to load Overview</h2>
          <p>{error || "No overview data was returned."}</p>
          <p>Check that the FastAPI backend is running on port 8000.</p>
        </section>
      </div>
    )
  }

  const summary = data.summary

  return (
    <div className="page-stack">
      <section className="metric-grid">
        <MetricCard
          label="Total Sales"
          value={formatAmount(summary.total_sales)}
          icon={ChartNoAxesCombined}
        />

        <MetricCard
          label="Total Orders"
          value={formatAmount(summary.order_count, 0)}
          icon={FileText}
        />

        <MetricCard
          label="Items Sold"
          value={formatAmount(summary.items_sold, 0)}
          icon={Package}
        />

        <MetricCard
          label="Average Order Value"
          value={formatAmount(summary.average_order_value)}
          icon={Box}
        />

        <MetricCard
          label="Average Customer Rating"
          value={
            averageRating === null
              ? "N/A"
              : `${averageRating.toFixed(2)} / 5`
          }
          icon={Star}
        />
      </section>

      <section className="panel sales-panel">
        <div className="panel-heading">
          <div className="title-with-toggle">
            <h2>Sales Performance</h2>

            <div
              className="metric-toggle"
              role="group"
              aria-label="Sales metric"
            >
              <button
                className={metric === "sales" ? "selected" : ""}
                onClick={() => setMetric("sales")}
              >
                Sales
              </button>

              <button
                className={metric === "orders" ? "selected" : ""}
                onClick={() => setMetric("orders")}
              >
                Orders
              </button>
            </div>
          </div>

          <div className="legend">
            <span>
              <i className="current" />
              {metric === "sales" ? "Daily Sales" : "Daily Orders"}
            </span>
          </div>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="salesFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={orange} stopOpacity=".5" />
                  <stop offset="100%" stopColor={orange} stopOpacity=".03" />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="#e8edf1" />

              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(`${value}T00:00:00`)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8))}
              />

              <YAxis
                tickFormatter={(value) =>
                  metric === "sales"
                    ? formatAmount(value / 1000, 0) + "K"
                    : String(value)
                }
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: "#ffbea6",
                  strokeWidth: 12,
                  opacity: 0.18,
                }}
              />

              <Area
                type="monotone"
                dataKey={metric}
                stroke={orange}
                strokeWidth={2.4}
                fill="url(#salesFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="overview-lower">
        <section className="panel ranking">
          <h2>Top Performing Restaurants</h2>

          {data.top_restaurants.map((restaurant, index) => (
            <div className="rank-row" key={restaurant.restaurant_id}>
              <span className={`rank rank-${index + 1}`}>
                {index + 1}
              </span>

              <span className="rank-name">{restaurant.name}</span>

              <span className="bar-track">
                <i
                  style={{
                    width: `${
                      data.top_restaurants[0]?.sales > 0
                        ? (restaurant.sales /
                            data.top_restaurants[0].sales) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </span>

              <strong>{formatAmount(restaurant.sales)}</strong>
            </div>
          ))}

          {data.top_restaurants.length === 0 && (
            <p>No restaurant sales found for this filter.</p>
          )}
        </section>

        <section className="panel weekday">
          <h2>Sales by Weekday</h2>

          <div className="weekday-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.weekday_sales}
                margin={{ top: 8, right: 5, left: -22, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#e8edf1" />

                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tickFormatter={(value) =>
                    formatAmount(value / 1000, 0) + "K"
                  }
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value) => formatAmount(Number(value ?? 0))}
                  cursor={{ fill: "#fff1eb" }}
                />

                <Bar
                  dataKey="sales"
                  fill={orange}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="panel highlights">
        <div className="highlight-title">
          <h2>Performance Highlights</h2>

          <button onClick={goAnalyst}>
            Ask AI Analyst <Sparkles size={14} />
          </button>
        </div>

        <div className="highlight-grid">
          <Highlight icon={TrendingUp}>
            {bestWeekday
              ? `${bestWeekday.day} has the highest recorded weekday sales at ${formatAmount(bestWeekday.sales)}.`
              : "Weekday sales data is unavailable."}
          </Highlight>

          <Highlight icon={BarChart3}>
            Completed sales account for{" "}
            <b>
              {completedSalesShare === null
                ? "N/A"
                : `${completedSalesShare.toFixed(1)}%`}
            </b>{" "}
            of total recorded sales.
          </Highlight>

          <Highlight icon={Box}>
            The dataset covers{" "}
            <b>{summary.restaurant_count} restaurants</b>
            {summary.period_start && summary.period_end
              ? ` from ${summary.period_start} to ${summary.period_end}.`
              : "."}
          </Highlight>
        </div>
      </section>
    </div>
  )
}

export function Highlight({
  icon: Icon,
  children,
}: {
  icon: typeof TrendingUp
  children: React.ReactNode
}) {
  return (
    <div className="highlight">
      <span>
        <Icon size={20} />
      </span>
      <p>{children}</p>
    </div>
  )
}