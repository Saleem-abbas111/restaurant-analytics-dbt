
import { Star, Store } from "lucide-react"
import { orange } from "@/lib/format"

export function MetricCard({
  label,
  value,
  change,
  changeLabel = "vs prev. period",
  icon: Icon,
  stars,
  spark,
}: {
  label: string
  value: string
  change?: string
  changeLabel?: string
  icon: typeof Store
  stars?: boolean
  spark?: boolean
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon size={15} />
        </span>
      </div>

      <div className="metric-value">
        {value}

        {stars && (
          <span className="stars">
            {" "}
            <Star fill={orange} /> <Star fill={orange} />{" "}
            <Star fill={orange} /> <Star fill={orange} /> <Star />
          </span>
        )}

        {spark && (
          <svg className="mini-spark" viewBox="0 0 60 25">
            <path d="M2 21L10 16L18 18L27 10L35 13L45 6L56 2" />
          </svg>
        )}
      </div>

      {change !== undefined && (
        <div className="change">
          <strong>{change.startsWith("-") ? "" : "+"}{change}</strong>{" "}
          {changeLabel}
        </div>
      )}
    </article>
  )
}
