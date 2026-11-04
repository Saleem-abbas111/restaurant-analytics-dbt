
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Star, Store } from "lucide-react";
import { apiGet } from "@/lib/api";
import "./ReviewsPage.css";

type ReviewRestaurant = {
  restaurant_id: number | null;
  restaurant_name: string;
  review_count: number;
  average_rating: number;
  lowest_rating: number;
  highest_rating: number;
  first_review_date: string | null;
  latest_review_date: string | null;
};

type ReviewsApiResponse = {
  summary: {
    total_reviews: number;
    restaurant_count: number;
    weighted_average_rating: number;
    lowest_rating: number;
    highest_rating: number;
    first_review_date: string | null;
    latest_review_date: string | null;
  };
  restaurants: ReviewRestaurant[];
};

type ReviewsPageProps = {
  restaurantId: string;
  refreshKey: number;
};

function formatDate(date: string | null) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RatingStars({ rating }: { rating: number }) {
  const roundedRating = Math.max(
    0,
    Math.min(5, Math.round(rating))
  );

  return (
    <span
      className="review-stars"
      aria-label={`${rating.toFixed(2)} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={16}
          fill={index < roundedRating ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export function ReviewsPage({
  restaurantId,
  refreshKey,
}: ReviewsPageProps) {
  const [data, setData] = useState<ReviewsApiResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setLoading(true);
      setError("");

      try {
        const result = await apiGet<ReviewsApiResponse>(
          "/api/reviews",
          {
            restaurant_id: restaurantId || undefined,
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
              : "Unable to load review data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, refreshKey]);

  const filteredRestaurants = useMemo(() => {
    const query = search.toLowerCase().trim();

    return (data?.restaurants ?? []).filter((restaurant) =>
      restaurant.restaurant_name.toLowerCase().includes(query)
    );
  }, [data, search]);

  const summary = data?.summary;

  return (
    <div className="reviews-page">
      <div className="reviews-heading">
        <div>
          <h1>Customer Reviews</h1>
          <p>
            Monitor restaurant ratings, review volumes, and rating
            coverage.
          </p>
        </div>
      </div>

      {error && (
        <div className="reviews-error" role="alert">
          <strong>Could not load reviews</strong>
          <p>{error}</p>
        </div>
      )}

      <section className="reviews-summary">
        <div className="reviews-rating-block">
          <span className="reviews-label">Overall Average Rating</span>

          <div className="reviews-rating-value">
            {loading
              ? "..."
              : (summary?.weighted_average_rating ?? 0).toFixed(2)}
          </div>

          <RatingStars
            rating={summary?.weighted_average_rating ?? 0}
          />

          <span className="reviews-subtitle">
            {loading
              ? "Loading reviews..."
              : `${(summary?.total_reviews ?? 0).toLocaleString()} total reviews`}
          </span>
        </div>

        <div className="reviews-summary-details">
          <div className="reviews-detail-item">
            <span>First review</span>
            <strong>
              {loading ? "..." : formatDate(summary?.first_review_date ?? null)}
            </strong>
          </div>

          <div className="reviews-detail-item">
            <span>Latest review</span>
            <strong>
              {loading ? "..." : formatDate(summary?.latest_review_date ?? null)}
            </strong>
          </div>

          <div className="reviews-detail-item">
            <span>Rating coverage</span>
            <strong>
              {loading
                ? "..."
                : (summary?.restaurant_count ?? 0).toLocaleString()}
            </strong>
            <small>Restaurants with review records</small>
          </div>
        </div>
      </section>

      <section className="reviews-table-panel">
        <div className="reviews-table-heading">
          <div>
            <h2>Restaurant Rating Performance</h2>
            <p>
              Average ratings, review volumes, and rating ranges by
              restaurant.
            </p>
          </div>

          <div className="reviews-search">
            <MessageSquare size={17} />
            <input
              type="search"
              placeholder="Search restaurants..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="reviews-state">Loading review data...</div>
        ) : error ? (
          <div className="reviews-state">
            Review data could not be displayed.
          </div>
        ) : (
          <div className="reviews-table-scroll">
            <table className="reviews-table">
              <thead>
                <tr>
                  <th>Restaurant</th>
                  <th>Average Rating</th>
                  <th>Review Count</th>
                  <th>Lowest Rating</th>
                  <th>Highest Rating</th>
                  <th>Latest Review</th>
                </tr>
              </thead>

              <tbody>
                {filteredRestaurants.map((restaurant, index) => (
                  <tr
                    key={
                      restaurant.restaurant_id ??
                      `${restaurant.restaurant_name}-${index}`
                    }
                  >
                    <td className="reviews-restaurant-name">
                      <Store size={16} />
                      {restaurant.restaurant_name}
                    </td>

                    <td>
                      <div className="reviews-table-rating">
                        <strong>
                          {restaurant.average_rating.toFixed(2)}
                        </strong>
                        <RatingStars
                          rating={restaurant.average_rating}
                        />
                      </div>
                    </td>

                    <td>{restaurant.review_count.toLocaleString()}</td>

                    <td>{restaurant.lowest_rating.toFixed(1)}</td>

                    <td>{restaurant.highest_rating.toFixed(1)}</td>

                    <td>
                      {formatDate(restaurant.latest_review_date)}
                    </td>
                  </tr>
                ))}

                {filteredRestaurants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="reviews-empty">
                      No matching restaurant review records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="reviews-table-footer">
          Showing {filteredRestaurants.length} of{" "}
          {data?.restaurants.length ?? 0} restaurants
        </div>
      </section>

      <div className="reviews-data-note">
        <strong>Data note:</strong> This dashboard uses aggregated
        restaurant review records. Individual review text, customer
        details, sentiment, and rating distributions are not available
        in the current dataset.
      </div>
    </div>
  );
}
