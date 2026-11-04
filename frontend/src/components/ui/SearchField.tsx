import { Search } from "lucide-react"

export function SearchField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="search">
      <Search size={16} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        aria-label="Search table"
      />
    </label>
  )
}
