// Mock financial data for Hive dashboard
// Simulates a user's monthly spending across different categories

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  description: string;
}

export interface SpendingCategory {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  amount: number;
  percentage: number;
  color: string; // Hex color for the category
  gradient: {
    from: string;
    to: string;
  };
  transactions: Transaction[];
}

export interface MonthlySpending {
  month: string;
  year: number;
  totalSpent: number;
  totalIncome: number;
  categories: SpendingCategory[];
}

// Generate realistic transaction data
const generateTransactions = (
  category: string,
  merchants: { name: string; amountRange: [number, number] }[],
  count: number
): Transaction[] => {
  const transactions: Transaction[] = [];
  const currentDate = new Date();

  for (let i = 0; i < count; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const amount =
      Math.round(
        (merchant.amountRange[0] +
          Math.random() * (merchant.amountRange[1] - merchant.amountRange[0])) *
          100
      ) / 100;

    const daysAgo = Math.floor(Math.random() * 30);
    const transactionDate = new Date(currentDate);
    transactionDate.setDate(transactionDate.getDate() - daysAgo);

    transactions.push({
      id: `${category}-${i}-${Date.now()}`,
      merchant: merchant.name,
      amount,
      date: transactionDate.toISOString().split("T")[0],
      description: `${merchant.name} purchase`,
    });
  }

  return transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

// Category-specific merchant data
const foodMerchants = [
  { name: "Chipotle", amountRange: [12, 18] as [number, number] },
  { name: "Starbucks", amountRange: [5, 12] as [number, number] },
  { name: "Chick-fil-A", amountRange: [8, 15] as [number, number] },
  { name: "Olive Garden", amountRange: [25, 55] as [number, number] },
  { name: "Local Pizzeria", amountRange: [18, 35] as [number, number] },
  { name: "Sushi Palace", amountRange: [30, 65] as [number, number] },
  { name: "Thai Express", amountRange: [15, 28] as [number, number] },
  { name: "Burger Joint", amountRange: [10, 20] as [number, number] },
];

const groceryMerchants = [
  { name: "Whole Foods", amountRange: [45, 120] as [number, number] },
  { name: "Trader Joe's", amountRange: [35, 85] as [number, number] },
  { name: "Costco", amountRange: [80, 200] as [number, number] },
  { name: "Kroger", amountRange: [40, 95] as [number, number] },
  { name: "Target Grocery", amountRange: [30, 75] as [number, number] },
];

const transportMerchants = [
  { name: "Shell Gas", amountRange: [35, 65] as [number, number] },
  { name: "Uber", amountRange: [12, 45] as [number, number] },
  { name: "Lyft", amountRange: [10, 38] as [number, number] },
  { name: "BP Gas", amountRange: [40, 70] as [number, number] },
  { name: "Metro Transit", amountRange: [2.5, 5] as [number, number] },
  { name: "Parking Garage", amountRange: [8, 25] as [number, number] },
];

const entertainmentMerchants = [
  { name: "Netflix", amountRange: [15.99, 22.99] as [number, number] },
  { name: "Spotify", amountRange: [10.99, 16.99] as [number, number] },
  { name: "AMC Theatres", amountRange: [15, 35] as [number, number] },
  { name: "Steam Games", amountRange: [10, 60] as [number, number] },
  { name: "Concert Tickets", amountRange: [50, 150] as [number, number] },
  { name: "Disney+", amountRange: [7.99, 13.99] as [number, number] },
  { name: "Bowling Alley", amountRange: [25, 45] as [number, number] },
];

const shoppingMerchants = [
  { name: "Amazon", amountRange: [15, 120] as [number, number] },
  { name: "Target", amountRange: [20, 80] as [number, number] },
  { name: "Best Buy", amountRange: [50, 300] as [number, number] },
  { name: "Nike", amountRange: [60, 180] as [number, number] },
  { name: "IKEA", amountRange: [40, 250] as [number, number] },
  { name: "Nordstrom", amountRange: [45, 200] as [number, number] },
];

const utilityMerchants = [
  { name: "Electric Company", amountRange: [85, 150] as [number, number] },
  { name: "Water Utility", amountRange: [35, 60] as [number, number] },
  { name: "Internet Provider", amountRange: [65, 100] as [number, number] },
  { name: "Phone Bill", amountRange: [45, 90] as [number, number] },
];

const healthcareMerchants = [
  { name: "CVS Pharmacy", amountRange: [10, 45] as [number, number] },
  { name: "Walgreens", amountRange: [8, 40] as [number, number] },
  { name: "Doctor's Office", amountRange: [25, 75] as [number, number] },
  { name: "Dental Care", amountRange: [30, 100] as [number, number] },
  { name: "Vision Center", amountRange: [50, 200] as [number, number] },
];

const housingMerchants = [
  { name: "Rent Payment", amountRange: [1500, 1500] as [number, number] },
  { name: "Home Insurance", amountRange: [120, 120] as [number, number] },
  { name: "Home Repair", amountRange: [50, 300] as [number, number] },
];

const travelMerchants = [
  { name: "Delta Airlines", amountRange: [200, 500] as [number, number] },
  { name: "Marriott Hotel", amountRange: [150, 350] as [number, number] },
  { name: "Airbnb", amountRange: [100, 280] as [number, number] },
  { name: "Rental Car", amountRange: [45, 120] as [number, number] },
];

const fitnessMerchants = [
  { name: "Gym Membership", amountRange: [40, 60] as [number, number] },
  { name: "Yoga Studio", amountRange: [20, 35] as [number, number] },
  { name: "Sports Equipment", amountRange: [30, 150] as [number, number] },
  { name: "Running Shoes", amountRange: [80, 180] as [number, number] },
];

// Build the spending categories with realistic proportions
const buildCategories = (): SpendingCategory[] => {
  const categories: SpendingCategory[] = [
    {
      id: "housing",
      name: "Housing",
      icon: "Home",
      amount: 1720,
      percentage: 0, // Will be calculated
      color: "#8B5CF6",
      gradient: { from: "#8B5CF6", to: "#6D28D9" },
      transactions: generateTransactions("housing", housingMerchants, 3),
    },
    {
      id: "food",
      name: "Food & Dining",
      icon: "Utensils",
      amount: 485.32,
      percentage: 0,
      color: "#F59E0B",
      gradient: { from: "#FBBF24", to: "#D97706" },
      transactions: generateTransactions("food", foodMerchants, 18),
    },
    {
      id: "groceries",
      name: "Groceries",
      icon: "ShoppingCart",
      amount: 412.87,
      percentage: 0,
      color: "#10B981",
      gradient: { from: "#34D399", to: "#059669" },
      transactions: generateTransactions("groceries", groceryMerchants, 8),
    },
    {
      id: "transportation",
      name: "Transportation",
      icon: "Car",
      amount: 342.45,
      percentage: 0,
      color: "#3B82F6",
      gradient: { from: "#60A5FA", to: "#2563EB" },
      transactions: generateTransactions("transport", transportMerchants, 12),
    },
    {
      id: "entertainment",
      name: "Entertainment",
      icon: "Film",
      amount: 187.94,
      percentage: 0,
      color: "#EC4899",
      gradient: { from: "#F472B6", to: "#DB2777" },
      transactions: generateTransactions(
        "entertainment",
        entertainmentMerchants,
        9
      ),
    },
    {
      id: "shopping",
      name: "Shopping",
      icon: "ShoppingBag",
      amount: 298.56,
      percentage: 0,
      color: "#F97316",
      gradient: { from: "#FB923C", to: "#EA580C" },
      transactions: generateTransactions("shopping", shoppingMerchants, 7),
    },
    {
      id: "utilities",
      name: "Utilities",
      icon: "Zap",
      amount: 245.0,
      percentage: 0,
      color: "#EAB308",
      gradient: { from: "#FDE047", to: "#CA8A04" },
      transactions: generateTransactions("utilities", utilityMerchants, 4),
    },
    {
      id: "healthcare",
      name: "Healthcare",
      icon: "Heart",
      amount: 156.78,
      percentage: 0,
      color: "#EF4444",
      gradient: { from: "#F87171", to: "#DC2626" },
      transactions: generateTransactions("healthcare", healthcareMerchants, 5),
    },
    {
      id: "travel",
      name: "Travel",
      icon: "Plane",
      amount: 425.0,
      percentage: 0,
      color: "#06B6D4",
      gradient: { from: "#22D3EE", to: "#0891B2" },
      transactions: generateTransactions("travel", travelMerchants, 4),
    },
    {
      id: "fitness",
      name: "Fitness",
      icon: "Dumbbell",
      amount: 95.0,
      percentage: 0,
      color: "#84CC16",
      gradient: { from: "#A3E635", to: "#65A30D" },
      transactions: generateTransactions("fitness", fitnessMerchants, 4),
    },
  ];

  // Calculate percentages
  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
  categories.forEach((cat) => {
    cat.percentage = Math.round((cat.amount / total) * 1000) / 10;
  });

  // Sort by amount (largest first)
  return categories.sort((a, b) => b.amount - a.amount);
};

export const mockMonthlySpending: MonthlySpending = {
  month: "December",
  year: 2024,
  totalSpent: 4368.92,
  totalIncome: 6500.0,
  categories: buildCategories(),
};

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

// Get spending trend data (mock)
export const getSpendingTrend = () => {
  return [
    { month: "Jul", amount: 3850 },
    { month: "Aug", amount: 4120 },
    { month: "Sep", amount: 3950 },
    { month: "Oct", amount: 4280 },
    { month: "Nov", amount: 4450 },
    { month: "Dec", amount: 4368.92 },
  ];
};

