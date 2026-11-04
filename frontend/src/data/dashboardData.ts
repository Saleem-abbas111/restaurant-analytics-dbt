export type NavPage = "overview" | "menu" | "inventory" | "reviews" | "analyst"

export const salesData = [
  { date: "Oct 1", sales: 2800, previous: 4100, orders: 196 },
  { date: "Oct 3", sales: 6400, previous: 5100, orders: 448 },
  { date: "Oct 5", sales: 7600, previous: 6800, orders: 532 },
  { date: "Oct 7", sales: 6200, previous: 6100, orders: 434 },
  { date: "Oct 9", sales: 9200, previous: 7300, orders: 644 },
  { date: "Oct 11", sales: 11100, previous: 9600, orders: 777 },
  { date: "Oct 13", sales: 8400, previous: 8100, orders: 588 },
  { date: "Oct 15", sales: 6100, previous: 9200, orders: 427 },
  { date: "Oct 17", sales: 8900, previous: 7900, orders: 623 },
  { date: "Oct 18", sales: 11420, previous: 7600, orders: 780 },
  { date: "Oct 20", sales: 12600, previous: 8100, orders: 841 },
  { date: "Oct 22", sales: 9200, previous: 8900, orders: 649 },
  { date: "Oct 23", sales: 6500, previous: 9000, orders: 455 },
  { date: "Oct 25", sales: 9700, previous: 8200, orders: 679 },
  { date: "Oct 27", sales: 10800, previous: 10200, orders: 756 },
  { date: "Oct 29", sales: 9100, previous: 9700, orders: 637 },
  { date: "Oct 30", sales: 12900, previous: 11100, orders: 903 },
]

export const weekdayData = [
  { day: "Mon", sales: 5400 },
  { day: "Tue", sales: 6900 },
  { day: "Wed", sales: 5700 },
  { day: "Thu", sales: 7100 },
  { day: "Fri", sales: 8600 },
  { day: "Sat", sales: 9500 },
  { day: "Sun", sales: 6800 },
]

export const restaurants = [
  {
    name: "Sample Restaurant A",
    sales: 92400,
    orders: 5280,
    rating: 4.8,
    change: 14.2,
  },
  { name: "Sample Restaurant B", sales: 68150, orders: 3942, rating: 4.7, change: 9.8 },
  {
    name: "Sample Restaurant C",
    sales: 52800,
    orders: 3050,
    rating: 4.5,
    change: 6.4,
  },
  {
    name: "Sample Restaurant D",
    sales: 45200,
    orders: 2690,
    rating: 4.6,
    change: 4.1,
  },
  {
    name: "Sample Restaurant E",
    sales: 26100,
    orders: 1530,
    rating: 4.3,
    change: -1.8,
  },
]

export const menuItems = [
  {
    name: "Truffle Smash Burger",
    category: "Mains",
    sold: 2840,
    revenue: 42600,
    margin: 68,
    trend: 18.4,
  },
  {
    name: "Charred Chicken Bowl",
    category: "Mains",
    sold: 2315,
    revenue: 32410,
    margin: 72,
    trend: 11.2,
  },
  {
    name: "Crispy Calamari",
    category: "Starters",
    sold: 1984,
    revenue: 21824,
    margin: 61,
    trend: 7.5,
  },
  {
    name: "Wild Mushroom Pasta",
    category: "Mains",
    sold: 1740,
    revenue: 27840,
    margin: 65,
    trend: 4.8,
  },
  {
    name: "Burnt Basque Cheesecake",
    category: "Desserts",
    sold: 1512,
    revenue: 13608,
    margin: 79,
    trend: 22.1,
  },
  {
    name: "Citrus Spritz",
    category: "Beverages",
    sold: 1420,
    revenue: 9940,
    margin: 82,
    trend: -2.4,
  },
]

export const inventoryItems = [
  {
    item: "Atlantic Salmon",
    category: "Protein",
    stock: 12,
    unit: "kg",
    par: 35,
    status: "Critical",
    cost: 420,
  },
  {
    item: "Avocados",
    category: "Produce",
    stock: 18,
    unit: "pcs",
    par: 60,
    status: "Low",
    cost: 54,
  },
  {
    item: "Truffle Aioli",
    category: "Prepared",
    stock: 4,
    unit: "ltr",
    par: 12,
    status: "Low",
    cost: 96,
  },
  {
    item: "Ground Beef",
    category: "Protein",
    stock: 48,
    unit: "kg",
    par: 55,
    status: "Healthy",
    cost: 576,
  },
  {
    item: "Brioche Buns",
    category: "Bakery",
    stock: 94,
    unit: "pcs",
    par: 80,
    status: "Healthy",
    cost: 66,
  },
  {
    item: "Cooking Oil",
    category: "Pantry",
    stock: 28,
    unit: "ltr",
    par: 30,
    status: "Healthy",
    cost: 84,
  },
]

export const reviewData = [
  {
    source: "Google",
    customer: "Maya A.",
    rating: 5,
    text: "Exceptional service and the new seasonal menu is outstanding.",
    date: "Oct 30",
    sentiment: "Positive",
  },
  {
    source: "OpenTable",
    customer: "James R.",
    rating: 4,
    text: "Great atmosphere. Dinner service was a little slow at peak time.",
    date: "Oct 29",
    sentiment: "Mixed",
  },
  {
    source: "Google",
    customer: "Sara K.",
    rating: 5,
    text: "Best burger in the city. Staff made our anniversary memorable.",
    date: "Oct 28",
    sentiment: "Positive",
  },
  {
    source: "Tripadvisor",
    customer: "Daniel C.",
    rating: 3,
    text: "Food was good, but two items were unavailable when we ordered.",
    date: "Oct 27",
    sentiment: "Mixed",
  },
  {
    source: "Google",
    customer: "Noah P.",
    rating: 5,
    text: "Beautiful interiors, thoughtful service and excellent desserts.",
    date: "Oct 26",
    sentiment: "Positive",
  },
]

export const pageMeta: Record<NavPage, { title: string; subtitle: string }> = {
  overview: {
    title: "Restaurant Overview",
    subtitle: "Monitor performance across your restaurant portfolio.",
  },
  menu: {
    title: "Menu Performance",
    subtitle: "Understand product profitability, popularity, and sales trends.",
  },
  inventory: {
    title: "Inventory",
    subtitle: "Track stock health, usage, and replenishment across locations.",
  },
  reviews: {
    title: "Customer Reviews",
    subtitle: "Monitor guest sentiment and turn feedback into action.",
  },
  analyst: {
    title: "AI Data Analyst",
    subtitle: "Ask questions about your business in plain language.",
  },
}
