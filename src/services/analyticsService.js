import { supabase } from "../config/supabase";

const FALLBACK_CATEGORY = {
  name: "Uncategorized",
  icon: "tag-outline",
  color: "#94A3B8",
};

function getExpenseCategory(expense) {
  const category = expense?.categories;
  if (!category || !category.name) {
    return FALLBACK_CATEGORY;
  }
  return category;
}

function accumulateCategoryTotals(expenses) {
  const categoryMap = new Map();

  expenses.forEach((expense) => {
    const category = getExpenseCategory(expense);
    if (!categoryMap.has(category.name)) {
      categoryMap.set(category.name, {
        name: category.name,
        icon: category.icon,
        color: category.color,
        amount: 0,
        count: 0,
      });
    }
    const catData = categoryMap.get(category.name);
    catData.amount += Number(expense.amount || 0);
    catData.count += 1;
  });

  return categoryMap;
}

/**
 * Fetches expense trends over time with additional statistics
 * @param {string} userId - The ID of the current user
 * @param {string} period - The time period ('week', 'month', 'year')
 * @returns {Promise<Object>} Object containing trend data and statistics
 */
export const fetchExpenseTrends = async (userId, period) => {
  try {
    // Get the current user's expense board
    const { data: expenseBoard, error: boardError } = await supabase
      .from("expense_boards")
      .select("id, created_by")
      .eq("created_by", userId.toString());

    console.log("expenseBoard fetchExpenseTrends", userId, expenseBoard);

    const { data: sharedBoards, error: sharedError } = await supabase
      .from("shared_users")
      .select("board_id, user_id, shared_with")
      .eq("user_id", userId.toString())
      .eq("is_accepted", true);
    console.log("sharedBoards", sharedBoards);
    if (sharedError) throw sharedError;

    const ownedIds = expenseBoard?.map((b) => b.id) || [];
    const boardIds = [
      ...ownedIds,
      ...(sharedBoards || []).map((s) => s.board_id),
    ];

    if (boardIds.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
        statistics: {
          totalAmount: 0,
          averageAmount: 0,
          highestAmount: 0,
          lowestAmount: 0,
          totalCount: 0,
          averageAmountPerDay: 0,
          daysInPeriod: 0,
          categoryBreakdown: [],
          previousPeriod: {
            totalAmount: 0,
            percentageChange: 0,
          },
          percentageChange: 0,
        },
        insights: [],
      };
    }
    console.log("-----", boardIds);

    // Calculate date ranges for current and previous period
    const now = new Date();
    let startDate, endDate, previousStartDate, previousEndDate;

    switch (period) {
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        break;
      case "month":
        startDate = new Date(now.setDate(now.getDate() - 30));
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate = new Date(startDate);
        break;
      case "year":
        startDate = new Date(now.setDate(now.getDate() - 365));
        previousStartDate = new Date(startDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate = new Date(startDate);
        break;
      case "all":
        startDate = new Date(0);
        previousStartDate = new Date(0);
        previousEndDate = new Date(0);
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate = new Date(startDate);
    }

    endDate = new Date();

    // Fetch current period expenses with categories
    const { data: currentData, error: currentError } = await supabase
      .from("expenses")
      .select(
        `
        amount,
        date,
        category_id,
        categories (
          name,
          icon,
          color
        )
      `
      )
      .in("board_id", boardIds)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: true });

    if (currentError) throw currentError;

    // Fetch previous period expenses
    const { data: previousData, error: previousError } = await supabase
      .from("expenses")
      .select("amount")
      .in("board_id", boardIds)
      .gte("date", previousStartDate.toISOString())
      .lt("date", previousEndDate.toISOString());

    if (previousError) throw previousError;

    const safeCurrentData = currentData || [];
    const safePreviousData = previousData || [];

    // Calculate current period statistics
    const currentAmounts = safeCurrentData.map((expense) => expense.amount);
    const totalAmount = currentAmounts.reduce((sum, amount) => sum + amount, 0);
    const highestAmount =
      currentAmounts.length > 0 ? Math.max(...currentAmounts) : 0;
    const lowestAmount =
      currentAmounts.length > 0 ? Math.min(...currentAmounts) : 0;
    const totalCount = safeCurrentData.length;
    const daysInPeriod = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24)
    );
    const averageAmountPerDay =
      daysInPeriod > 0 ? totalAmount / daysInPeriod : 0;

    // Calculate previous period total
    const previousTotal = safePreviousData.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Calculate percentage change
    const percentageChange =
      previousTotal > 0
        ? ((totalAmount - previousTotal) / previousTotal) * 100
        : 0;

    // Calculate category breakdown
    const categoryMap = accumulateCategoryTotals(safeCurrentData);

    // Convert to array and calculate percentages
    const categoryBreakdown = Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage:
          totalAmount > 0 ? Math.round((cat.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Generate insights based on the data
    const insights = [];

    // Add trend insight
    if (percentageChange !== 0) {
      insights.push({
        title:
          percentageChange > 0 ? "Spending Increased" : "Spending Decreased",
        description: `Your spending ${
          percentageChange > 0 ? "increased" : "decreased"
        } by ${Math.abs(percentageChange).toFixed(
          1
        )}% compared to last ${period}`,
        icon: percentageChange > 0 ? "trending-up" : "trending-down",
        color: percentageChange > 0 ? "#FF6B6B" : "#4ECDC4",
      });
    }

    // Add top category insight
    if (categoryBreakdown.length > 0) {
      const topCategory = categoryBreakdown[0];
      insights.push({
        title: "Top Category",
        description: `${topCategory.name} is your highest spending category at ${topCategory.percentage}%`,
        icon: topCategory.icon,
        color: topCategory.color,
      });
    }

    // Add savings opportunity insight
    if (categoryBreakdown.length > 1) {
      const secondCategory = categoryBreakdown[1];
      insights.push({
        title: "Savings Opportunity",
        description: `Consider reducing ${secondCategory.name} expenses (${secondCategory.percentage}% of total)`,
        icon: "piggy-bank",
        color: "#45B7D1",
      });
    }

    // Format the statistics object
    const statistics = {
      totalAmount: Number(totalAmount.toFixed(2)),
      highestAmount: Number(highestAmount.toFixed(2)),
      lowestAmount: Number(lowestAmount.toFixed(2)),
      totalCount,
      averageAmountPerDay: Number(averageAmountPerDay.toFixed(2)),
      daysInPeriod,
      categoryBreakdown,
      previousPeriod: {
        totalAmount: Number(previousTotal.toFixed(2)),
        percentageChange: Number(percentageChange.toFixed(1)),
      },
    };

    return {
      trendData: [], // You can add trend data here if needed
      statistics,
      insights,
    };
  } catch (error) {
    console.error("Error in fetchExpenseTrends:", error);
    throw error;
  }
};
