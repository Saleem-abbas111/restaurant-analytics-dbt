const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export async function apiGet<T>(
  path: string,
  params?: QueryParams
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    let errorMessage = `API request failed (${response.status})`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Keep the default error message if the response isn't JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}