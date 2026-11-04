
import { useState } from "react"
import { Check } from "lucide-react"
import type { NavPage } from "@/data/dashboardData"

import AnalystPage from "@/components/analyst/AnalystPage"
import { Sidebar } from "@/components/layout/Sidebar"
import { PageHeader } from "@/components/layout/PageHeader"

import { Overview } from "@/pages/OverviewPage"
import { MenuPage } from "@/pages/MenuPage"
import { InventoryPage } from "@/pages/InventoryPage"
import { ReviewsPage } from "@/pages/ReviewsPage"

import { toCsv } from "@/lib/csv"

export default function App() {
  const [page, setPage] = useState<NavPage>("overview")
  const [restaurantId, setRestaurantId] = useState("")
  const [range, setRange] = useState("Last 30 Days")
  const [metric, setMetric] = useState<"sales" | "orders">("sales")
  const [mobileNav, setMobileNav] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => {
    setRefreshKey((previous) => previous + 1)
    setRefreshed(true)

    window.setTimeout(() => {
      setRefreshed(false)
    }, 1800)
  }

  const exportCsv = () => {
    const blob = new Blob([toCsv(page)], {
      type: "text/csv;charset=utf-8;",
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")

    a.href = url
    a.download = `restaurant-intelligence-${page}.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        open={mobileNav}
        close={() => setMobileNav(false)}
      />

      {mobileNav && (
        <button
          className="backdrop"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <main className="main">
        <PageHeader
          page={page}
          onMenu={() => setMobileNav(true)}
          onRefresh={refresh}
          onExport={exportCsv}
          restaurantId={restaurantId}
          setRestaurantId={setRestaurantId}
          range={range}
          setRange={setRange}
        />

        <div className="sample-badge">
          {page === "analyst"
            ? "Restaurant Intelligence Analyst"
            : "Live API connection · Synthetic dataset"}
        </div>

        {refreshed && (
          <div className="toast">
            <Check size={16} /> Refresh requested
          </div>
        )}

        <div style={{ display: page === "overview" ? "block" : "none" }}>
      <Overview
        metric={metric}
        setMetric={setMetric}
        goAnalyst={() => setPage("analyst")}
        restaurantId={restaurantId}
        range={range}
        refreshKey={refreshKey}
      />
    </div>

    <div style={{ display: page === "menu" ? "block" : "none" }}>
    <MenuPage
      restaurantId={restaurantId}
      range={range}
      refreshKey={refreshKey}
    />
    </div>

    <div style={{ display: page === "inventory" ? "block" : "none" }}>
      <InventoryPage
        restaurantId={restaurantId}
        refreshKey={refreshKey}
      />
    </div>

    <div style={{ display: page === "reviews" ? "block" : "none" }}>
      <ReviewsPage
        restaurantId={restaurantId}
        refreshKey={refreshKey}
      />
    </div>

    <div style={{ display: page === "analyst" ? "block" : "none" }}>
      <AnalystPage />
    </div>
      </main>
    </div>
  )
}
