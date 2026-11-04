
import { useMemo, useState, useEffect } from "react";
import { ChevronsUpDown } from "lucide-react";
import { money } from "../../lib/format";

export type MenuTableRow = {
  menu_item_id: number | null;
  name: string;
  category: string;
  restaurant_id: number | null;
  price: number | null;
  orders_containing_item: number;
  units_sold: number;
  revenue: number;
};

export type InventoryTableRow = {
  inventory_id: number | null;
  restaurant_id: number | null;
  restaurant_name: string;
  ingredient_id: number | null;
  ingredient_name: string;
  category: string;
  unit: string;
  quantity_on_hand: number;
};

type SortableTableProps = {
  type: "menu" | "inventory";
  search: string;
  menuRows?: MenuTableRow[];
  inventoryRows?: InventoryTableRow[];
};

export function SortableTable({
  type,
  search,
  menuRows = [],
  inventoryRows = [],
}: SortableTableProps) {
  const [sortKey, setSortKey] = useState(
    type === "menu" ? "revenue" : "quantity_on_hand"
  );

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    "desc"
  );

  useEffect(() => {
    setSortKey(type === "menu" ? "revenue" : "quantity_on_hand");
    setSortDirection("desc");
  }, [type]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  const filteredMenuRows = useMemo(() => {
    const query = search.toLowerCase().trim();

    return menuRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [menuRows, search]);

  const filteredInventoryRows = useMemo(() => {
    const query = search.toLowerCase().trim();

    return inventoryRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [inventoryRows, search]);

  const sortedMenuRows = useMemo(() => {
    return [...filteredMenuRows].sort((a, b) => {
      const first = a[sortKey as keyof MenuTableRow];
      const second = b[sortKey as keyof MenuTableRow];

      const comparison =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : String(first ?? "").localeCompare(String(second ?? ""));

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredMenuRows, sortKey, sortDirection]);

  const sortedInventoryRows = useMemo(() => {
    return [...filteredInventoryRows].sort((a, b) => {
      const first = a[sortKey as keyof InventoryTableRow];
      const second = b[sortKey as keyof InventoryTableRow];

      const comparison =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : String(first ?? "").localeCompare(String(second ?? ""));

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredInventoryRows, sortKey, sortDirection]);

  if (type === "menu") {
    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {[
                ["name", "Menu Item"],
                ["category", "Category"],
                ["units_sold", "Units Sold"],
                ["orders_containing_item", "Orders"],
                ["price", "Price"],
                ["revenue", "Revenue"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button
                    type="button"
                    className="table-sort-button"
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    <ChevronsUpDown size={14} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedMenuRows.map((row, index) => (
              <tr key={row.menu_item_id ?? index}>
                <td>{row.name}</td>
                <td>{row.category}</td>
                <td>{row.units_sold.toLocaleString()}</td>
                <td>{row.orders_containing_item.toLocaleString()}</td>
                <td>{row.price == null ? "—" : money(row.price)}</td>
                <td>{money(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {[
              ["ingredient_name", "Ingredient"],
              ["category", "Category"],
              ["restaurant_name", "Restaurant"],
              ["quantity_on_hand", "Quantity on Hand"],
              ["unit", "Unit"],
            ].map(([key, label]) => (
              <th key={key}>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() => handleSort(key)}
                >
                  {label}
                  <ChevronsUpDown size={14} />
                </button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedInventoryRows.map((row, index) => (
            <tr key={row.inventory_id ?? index}>
              <td>{row.ingredient_name}</td>
              <td>{row.category}</td>
              <td>{row.restaurant_name}</td>
              <td>{row.quantity_on_hand.toLocaleString()}</td>
              <td>{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
