import { getCurrentUser } from "../utils/supabaseAuth";
import { supabase } from "../config/supabase";
import { devLog } from "../utils/logger";
import {
  getAccessibleBoardIds,
  getBoardSummaries,
  getExpenseCountsByBoard,
} from "./boardAccessService";

export const dashboardService = {
  /**
   * Recent transactions for dashboard.
   * Pass pre-fetched boardIds to skip duplicate board lookups.
   */
  async getRecentTransactions(limit = 10, boardIds = null) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { data: [], error: new Error("No user found") };
      }

      let resolvedBoardIds = boardIds;
      if (!resolvedBoardIds) {
        resolvedBoardIds = await getAccessibleBoardIds();
      }

      if (!resolvedBoardIds.length) return { data: [], error: null };

      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(
          `
        *,
        categories (name, color, icon),
        expense_boards (name)
      `
        )
        .in("board_id", resolvedBoardIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (expensesError) {
        console.error("Error fetching expenses:", expensesError.message);
        return { data: [], error: expensesError };
      }

      if (!expenses?.length) return { data: [], error: null };

      const uniqueUserIds = [...new Set(expenses.map((e) => e.created_by))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email_address, avatar_url")
        .in("id", uniqueUserIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError.message);
        return { data: [], error: profilesError };
      }

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const transformed = expenses.map((expense) => ({
        id: expense.id,
        category: expense.categories?.name || "Uncategorized",
        amount: expense.amount,
        date: expense.created_at,
        description: expense.description,
        icon: expense.categories?.icon || "dots-horizontal",
        color: expense.categories?.color || "#45B7D1",
        board: expense.expense_boards?.name || "Default Board",
        payment_method: expense.payment_method || "Unknown",
        created_by_profile: profilesMap[expense.created_by] || null,
      }));

      devLog("recent transactions", transformed.length);
      return { data: transformed, error: null };
    } catch (error) {
      console.error("Unexpected error:", error);
      return { data: [], error };
    }
  },
};
