export type AnalystResultRow = {
  restaurant: string
  completedSales: number
  orders: number
  averageOrderValue: number
}

export type AnalystResponse = {
  id: string
  question: string
  summary: string
  keyFindings: string[]
  recommendedActions: string[]
  caveats: string[]
  rows: AnalystResultRow[]
  sql: string
  generatedAt: string
  followUps: string[]
}

export const analystCategories = [
  {
    title: "Sales Performance",
    description: "Understand sales trends across your restaurant portfolio.",
    question:
      "Which 5 restaurants generated the highest completed sales, and what should we do to improve performance across the portfolio?",
    icon: "sales",
  },
  {
    title: "Menu Optimization",
    description: "Find profitable items and opportunities to improve menu mix.",
    question: "Which menu items have the best combination of growth and gross margin?",
    icon: "menu",
  },
  {
    title: "Inventory Management",
    description: "Identify stock risks, waste, and replenishment priorities.",
    question: "Which inventory items are most at risk over the next seven days?",
    icon: "inventory",
  },
  {
    title: "Customer Experience",
    description: "Discover the themes having the greatest impact on guests.",
    question: "What are the most important themes in our recent negative reviews?",
    icon: "reviews",
  },
] as const

export const suggestedQuestions = [
  "Which locations are losing momentum?",
  "How can we increase average order value?",
  "What caused the weekend sales lift?",
  "Where are our biggest margin opportunities?",
]

export const defaultAnalystResponse: AnalystResponse = {
  id: "analysis-001",
  question:
    "Which 5 restaurants generated the highest completed sales, and what should we do to improve performance across the portfolio?",
  summary:
    "Sample Restaurant A leads the portfolio with $142,500 in completed sales. The top five locations generated 64% of regional sales, but a material performance gap remains between the first and fifth ranked restaurants.",
  keyFindings: [
    "Top-performing restaurant: Sample Restaurant A with $142,500 in completed sales.",
    "Top 5 contribution: 64% ($512,800) of total regional sales.",
    "Sales gap: The highest-performing restaurant outperformed the fifth by 42%.",
  ],
  recommendedActions: [
    "Investigate operational practices at Sample Restaurant A and apply them to lower-performing locations.",
    "Review weekend staffing and daypart conversion at Sample Restaurant B and Sample Restaurant C.",
    "Test location-specific menu bundles before changing portfolio-wide pricing.",
  ],
  caveats: [
    "Results include completed orders only and exclude cancellations and refunds.",
    "This analysis does not adjust for restaurant capacity or local operating hours.",
  ],
  rows: [
    { restaurant: "Sample Restaurant A", completedSales: 142500, orders: 207, averageOrderValue: 74.68 },
    { restaurant: "Sample Restaurant B", completedSales: 118000, orders: 128, averageOrderValue: 38.84 },
    { restaurant: "Sample Restaurant C", completedSales: 94200, orders: 96, averageOrderValue: 23.94 },
    { restaurant: "Sample Restaurant D", completedSales: 85100, orders: 71, averageOrderValue: 10.78 },
    { restaurant: "Sample Restaurant E", completedSales: 73000, orders: 75, averageOrderValue: 73.39 },
  ],
  sql: `SELECT
  r.name AS restaurant,
  SUM(s.amount) AS completed_sales,
  COUNT(s.order_id) AS orders,
  AVG(s.amount) AS average_order_value
FROM restaurant_sales_mart s
JOIN restaurants r ON s.restaurant_id = r.id
WHERE s.order_status = 'COMPLETED'
  AND s.sale_date >= DATEADD(day, -30, CURRENT_DATE)
GROUP BY r.name
ORDER BY completed_sales DESC
LIMIT 5;`,
  generatedAt: "Just now",
  followUps: [
    "Compare these restaurants by average order value",
    "Show weekday versus weekend performance",
    "Which menu items drive the gap?",
  ],
}
