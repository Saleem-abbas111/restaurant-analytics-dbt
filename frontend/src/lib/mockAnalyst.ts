import type { AnalystResponse } from "@/data/analystData"
import { defaultAnalystResponse } from "@/data/analystData"

export async function runMockAnalysis(
  question: string,
  signal?: AbortSignal,
): Promise<AnalystResponse> {
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, 1100)
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timeout)
      reject(new DOMException("Analysis cancelled", "AbortError"))
    })
  })

  if (/\b(error|fail|offline)\b/i.test(question)) {
    throw new Error("The analytics service could not complete this request.")
  }

  return {
    ...defaultAnalystResponse,
    id: `analysis-${Date.now()}`,
    question,
    generatedAt: "Just now",
  }
}

export function analystRowsToCsv(response: AnalystResponse) {
  const header = "Restaurant,Completed Sales,Orders,Average Order Value"
  const rows = response.rows.map(
    (row) =>
      `"${row.restaurant}",${row.completedSales},${row.orders},${row.averageOrderValue}`,
  )
  return [header, ...rows].join("\n")
}
