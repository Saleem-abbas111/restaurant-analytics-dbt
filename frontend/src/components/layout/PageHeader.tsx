
import { useEffect, useState } from "react"
import {
  ArrowDownToLine,
  CalendarDays,
  ChevronDown,
  Menu,
  RefreshCw,
  Store,
} from "lucide-react"

import type { NavPage } from "@/data/dashboardData"
import { pageMeta } from "@/data/dashboardData"
import { apiGet } from "@/lib/api"

type RestaurantOption = {
  restaurant_id: string | number
  name: string
}

type SelectOption = {
  value: string
  label: string
}

export function SelectControl({
  icon: Icon,
  value,
  options,
  onChange,
  label,
  disabled = false,
}: {
  icon: typeof Store
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  label: string
  disabled?: boolean
}) {
  return (
    <label className="select-control" aria-label={label}>
      <Icon size={16} />

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        title={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown size={14} />
    </label>
  )
}

export function PageHeader({
  page,
  onMenu,
  onRefresh,
  onExport,
  restaurantId,
  setRestaurantId,
  range,
  setRange,
}: {
  page: NavPage
  onMenu: () => void
  onRefresh: () => void
  onExport: () => void
  restaurantId: string
  setRestaurantId: (value: string) => void
  range: string
  setRange: (value: string) => void
}) {
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    let active = true

    async function loadRestaurants() {
      try {
        const result = await apiGet<RestaurantOption[]>("/api/restaurants")

        if (active) {
          setRestaurants(result)
        }
      } catch (error) {
        console.error("Could not load restaurants:", error)
      }
    }

    loadRestaurants()

    return () => {
      active = false
    }
  }, [])

  // Restore custom dates if a custom range is already selected.
  useEffect(() => {
    if (range.startsWith("Custom Range|")) {
      const parts = range.split("|")
      setStartDate(parts[1] || "")
      setEndDate(parts[2] || "")
    }
  }, [range])

  const restaurantOptions: SelectOption[] = [
    { value: "", label: "All Restaurants" },
    ...restaurants.map((restaurant) => ({
      value: String(restaurant.restaurant_id),
      label: restaurant.name,
    })),
  ]

  const dateOptions: SelectOption[] = [
    { value: "Last 7 Days", label: "Last 7 Days" },
    { value: "Last 30 Days", label: "Last 30 Days" },
    { value: "This Quarter", label: "This Quarter" },
    { value: "Year to Date", label: "Year to Date" },
    { value: "Custom Range", label: "Custom Range" },
  ]

  const selectedRange = range.startsWith("Custom Range")
    ? "Custom Range"
    : range

  function handleRangeChange(value: string) {
    if (value === "Custom Range") {
      setRange("Custom Range")
    } else {
      setRange(value)
      setStartDate("")
      setEndDate("")
    }
  }

  function updateCustomDates(start: string, end: string) {
    setStartDate(start)
    setEndDate(end)

    if (start && end && start <= end) {
      setRange(`Custom Range|${start}|${end}`)
    } else {
      setRange("Custom Range")
    }
  }

  const isOverview = page === "overview"

  return (
    <>
      <header className="page-header">
        <button
          className="mobile-menu"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu />
        </button>

        <div className="page-title">
          <h1>{pageMeta[page].title}</h1>
          <p>{pageMeta[page].subtitle}</p>
        </div>

        <div className="header-actions">
          {page !== "analyst" && (
            <>
              <button
                className="icon-btn"
                onClick={onRefresh}
                aria-label="Refresh data"
                title="Refresh data from Snowflake"
              >
                <RefreshCw size={18} />
              </button>

              <button className="export-btn" onClick={onExport}>
                <ArrowDownToLine size={17} />
                Export CSV
              </button>
            </>
          )}
        </div>
      </header>

      {page !== "analyst" && (
        <div className="filter-row">
          <SelectControl
            icon={Store}
            label="Filter by restaurant"
            value={restaurantId}
            onChange={setRestaurantId}
            options={restaurantOptions}
          />

          <SelectControl
          icon={CalendarDays}
          label="Filter by date range"
          value={selectedRange}
          onChange={handleRangeChange}
          options={dateOptions}
        />

          {selectedRange === "Custom Range" && (
            <>
              <label className="select-control custom-date-control">
                <span>From</span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) =>
                    updateCustomDates(event.target.value, endDate)
                  }
                  aria-label="Start date"
                />
              </label>

              <label className="select-control custom-date-control">
                <span>To</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) =>
                    updateCustomDates(startDate, event.target.value)
                  }
                  aria-label="End date"
                />
              </label>
            </>
          )}
        </div>
      )}
    </>
  )
}
