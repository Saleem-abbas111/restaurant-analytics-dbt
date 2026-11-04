import { BarChart3, Bot, Home, MessageSquareText, Package, UtensilsCrossed, X } from "lucide-react"
import type { NavPage } from "@/data/dashboardData"

export const navItems: { id: NavPage; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "menu", label: "Menu Performance", icon: UtensilsCrossed },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "reviews", label: "Customer Reviews", icon: MessageSquareText },
  { id: "analyst", label: "AI Data Analyst", icon: Bot },
]

export function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        <BarChart3 size={22} strokeWidth={2.5} />
      </div>
      <span>
        Restaurant
        <br />
        Intelligence
      </span>
    </div>
  )
}

export function Sidebar({
  page,
  setPage,
  open,
  close,
}: {
  page: NavPage
  setPage: (p: NavPage) => void
  open: boolean
  close: () => void
}) {
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-head">
        <Logo />
        <button
          className="mobile-close"
          onClick={close}
          aria-label="Close navigation"
        >
          <X />
        </button>
      </div>
      <nav aria-label="Primary navigation">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${page === id ? "active" : ""}`}
            onClick={() => {
              setPage(id)
              close()
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
