import type { NavPage } from "@/data/dashboardData"
import { inventoryItems, menuItems, restaurants, reviewData } from "@/data/dashboardData"

export function toCsv(page: NavPage) {
  const rows: any[] =
    page === "menu"
      ? menuItems
      : page === "inventory"
        ? inventoryItems
        : page === "reviews"
          ? reviewData
          : restaurants
  const headers = Object.keys(rows[0])
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n")
}
