import "./InventoryPage.css";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Package,
  Store,
  Tags,
} from "lucide-react";

import { MetricCard } from "@/components/ui/MetricCard";
import { SearchField } from "@/components/ui/SearchField";

import {
  SortableTable,
  type InventoryTableRow,
} from "@/components/ui/SortableTable";

import { apiGet } from "@/lib/api";

type InventoryApiResponse = {
  filters: {
    restaurant_id: number | null;
    search: string;
    limit: number;
  };
  summary: {
    inventory_records: number;
    distinct_ingredients: number;
    restaurant_count: number;
  };
  category_performance: {
    category: string;
    unit: string;
    inventory_records: number;
    distinct_ingredients: number;
    quantity_on_hand: number;
  }[];
  restaurant_performance: {
    restaurant_name: string;
    unit: string;
    inventory_records: number;
    quantity_on_hand: number;
  }[];
  inventory_items: InventoryTableRow[];
};

type InventoryPageProps = {
  restaurantId: string;
  refreshKey: number;
};

export function InventoryPage({
  restaurantId,
  refreshKey,
}: InventoryPageProps) {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<InventoryApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      try {
        setLoading(true);
        setError(null);

        const result = await apiGet<InventoryApiResponse>(
          "/api/inventory",
          {
            restaurant_id: restaurantId || undefined,
            search: search.trim() || undefined,
            limit: 200,
          }
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load inventory data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInventory();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, search, refreshKey]);

  const categoryCount = useMemo(() => {
    return new Set(
      (data?.category_performance ?? []).map(
        (item) => item.category
      )
    ).size;
  }, [data]);

  const inventoryRows = data?.inventory_items ?? [];

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <h4>Inventory Management</h4>
          <p>
            Monitor ingredient quantities and inventory records
            across restaurants.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="metrics-grid">
        <MetricCard
          label="Inventory Records"
          value={
            loading
              ? "..."
              : (data?.summary.inventory_records ?? 0).toLocaleString()
          }
          icon={Boxes}
        />

        <MetricCard
          label="Distinct Ingredients"
          value={
            loading
              ? "..."
              : (data?.summary.distinct_ingredients ?? 0).toLocaleString()
          }
          icon={Package}
        />

        <MetricCard
          label="Restaurants Covered"
          value={
            loading
              ? "..."
              : (data?.summary.restaurant_count ?? 0).toLocaleString()
          }
          icon={Store}
        />

        <MetricCard
          label="Categories Tracked"
          value={loading ? "..." : categoryCount.toLocaleString()}
          icon={Tags}
        />
      </div>

      <div className="section-header">
        <div>
          <h2>Inventory Records</h2>
          <p>
            Search ingredients, categories, and restaurant names.
          </p>
        </div>

        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search inventory..."
        />
      </div>

      {loading && (
        <p className="loading-message">Loading inventory data...</p>
      )}

      {!loading && !error && (
        <SortableTable
          type="inventory"
          search=""
          inventoryRows={inventoryRows}
        />
      )}

      {!loading && !error && inventoryRows.length === 0 && (
        <p className="empty-message">
          No inventory records found for the selected filters.
        </p>
      )}

      <div className="inventory-note">
        <strong>Data limitations:</strong> This dataset provides
        ingredient quantities on hand. It does not contain stock
        valuation, reorder thresholds, expiry dates, or waste data.
        These measures are therefore not displayed.
      </div>
    </div>
  );
}
