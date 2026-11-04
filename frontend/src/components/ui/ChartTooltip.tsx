import { money } from "@/lib/format"

type TooltipProps = {
  active?: boolean
  payload?: { value?: number; payload?: { orders?: number } }[]
  label?: string
}

export function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>
        {money(payload[0].value ?? 0)} · {payload[0].payload?.orders ?? "Sales"}
      </span>
    </div>
  )
}
