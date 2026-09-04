import { dashboardService } from "../services/dashboardService";
import { getBoardSummaries } from "../services/boardAccessService";
import { devLog } from "../utils/logger";
import { showToast } from "../utils/toast";

const fetchDashboardData = async () => {
  const dashboard = {
    stats: {
      totalBudget: 0,
      totalExpenses: 0,
      remainingBudget: 0,
    },
    recentTransactions: [],
    hasBoard: false,
  };

  try {
    const summaries = await getBoardSummaries();
    dashboard.hasBoard = summaries.length > 0;

    const totalBudget = summaries.reduce(
      (sum, board) => sum + (Number(board.total_budget) || 0),
      0
    );
    const totalExpenses = summaries.reduce(
      (sum, board) => sum + (Number(board.totalExpenses) || 0),
      0
    );

    dashboard.stats.totalBudget = totalBudget;
    dashboard.stats.totalExpenses = totalExpenses;
    dashboard.stats.remainingBudget = totalBudget - totalExpenses;

    const boardIds = summaries.map((b) => b.id);
    const result = await dashboardService.getRecentTransactions(20, boardIds);
    if (result.error) {
      devLog("Error fetching transactions:", result.error);
    }
    dashboard.recentTransactions = Array.isArray(result.data) ? result.data : [];
    return dashboard;
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    showToast.error("Failed to load dashboard data");
    return dashboard;
  }
};

export { fetchDashboardData };
