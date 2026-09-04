import { supabase } from "../config/supabase";
import { getCurrentUser } from "../utils/supabaseAuth";
import { getAccessibleBoardIds, invalidateBoardCache } from "./boardAccessService";

export const expenseService = {
  async getExpenses(category = null, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const user = await getCurrentUser();
      if (!user) throw new Error("User not authenticated");

      const boardIds = await getAccessibleBoardIds();

      if (boardIds.length === 0) {
        return {
          data: [],
          total: 0,
          hasMore: false,
          currentPage: page,
          totalPages: 0,
        };
      }

      let query = supabase
        .from("expenses")
        .select(
          `
          *,
          categories (name, color, icon),
          expense_boards (name)
          `,
          { count: "exact" }
        )
        .in("board_id", boardIds)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) query = query.eq("category_id", category);

      const { data: expenses, error, count } = await query;
      if (error) throw error;

      if (!expenses?.length) {
        return {
          data: [],
          total: count || 0,
          hasMore: false,
          currentPage: page,
          totalPages: 0,
        };
      }

      const userIds = [...new Set(expenses.map((e) => e.created_by))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const userMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const transformed = expenses.map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        date: expense.created_at,
        board_id: expense.board_id,
        category_id: expense.category_id,
        icon: expense.categories?.icon || "receipt",
        color: expense.categories?.color || "#6C5CE7",
        category: expense.categories?.name || "Uncategorized",
        board: expense.expense_boards?.name || "Default Board",
        payment_method: expense.payment_method || "Unknown",
        created_by: expense.created_by,
        created_by_profile: userMap[expense.created_by] || null,
      }));

      return {
        data: transformed,
        total: count,
        hasMore: offset + limit < count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      console.error("Error in getMergedExpenses:", error.message);
      return { data: [], error: error.message };
    }
  },

  async getExpensesbyBoardId(boardId, category = null, page = 1, limit = 10) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { data: [], total: 0, hasMore: false };
      }

      const offset = (page - 1) * limit;

      // Build query
      let query = supabase
        .from("expenses")
        .select(
          `
          *,
          category:categories (
            name,
            icon,
            color
          ),
          expense_boards (
            name
          )
        `,
          { count: "exact" }
        )
        .eq("board_id", boardId)

        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq("category_id", category);
      }

      const { data: expenses, error: expensesError, count } = await query;
      if (expensesError)
        throw new Error("Error fetching expenses: " + expensesError.message);

      // Fetch profile info of creators
      const creatorIds = [...new Set(expenses.map((e) => e.created_by))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", creatorIds);
      if (profilesError)
        throw new Error("Error fetching profiles: " + profilesError.message);

      const userMap = profiles.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      const hasMore = offset + limit < count;

      return {
        data: expenses.map((expense) => ({
          ...expense,
          icon: expense.category?.icon || "receipt",
          color: expense.category?.color || "#6C5CE7",
          board: expense.expense_boards?.name || "Unnamed Board",
          created_by_profile: userMap[expense.created_by] || null,
        })),
        total: count,
        hasMore,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      console.error("Error in getExpensesByBoardId:", error.message);
      return { data: [], total: 0, hasMore: false, error: error.message };
    }
  },

  async getExpenseById(expenseId) {
    try {
      const user = await getCurrentUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("expenses")
        .select(
          `
          *,
          category:categories (
            name,
            icon,
            color
          ),
          expense_boards (name)
        `
        )
        .eq("id", expenseId)
        .single();

      if (error) {
        console.error("Error fetching expense:", error.message);
        throw error;
      }

      // Get the creator's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name ")
        .eq("id", data.created_by)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        throw profileError;
      }

      return {
        ...data,
        board: data.expense_boards?.name || "Default Board",
        category: data.category?.name || "Uncategorized",
        icon: data.category?.icon || "receipt",
        color: data.category?.color || "#6C5CE7",
        created_by_profile: profile,
      };
    } catch (error) {
      console.error("Error in getExpenseById:", error.message);
      throw error;
    }
  },

  async createExpense(expenseData) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("expenses")
        .insert([
          {
            ...expenseData,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      invalidateBoardCache();
      return {
        ...data,
        created_by_profile: {
          id: user.id,
          full_name:
            user.user_metadata?.full_name || user.email?.split("@")[0] || "You",
        },
      };
    } catch (error) {
      console.error("Error in createExpense:", error.message);
      throw error;
    }
  },

  async updateExpense(expenseId, updates) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", expenseId)
        .select()
        .single();

      if (error) throw error;

      invalidateBoardCache();
      return {
        ...data,
        created_by_profile: {
          id: user.id,
          full_name:
            user.user_metadata?.full_name || user.email?.split("@")[0] || "You",
        },
      };
    } catch (error) {
      console.error("Error in updateExpense:", error.message);
      throw error;
    }
  },

  async deleteExpense(expenseId) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("created_by", user.id);

      if (error) throw error;

      invalidateBoardCache();
      return true;
    } catch (error) {
      console.error("Error in deleteExpense:", error.message);
      throw error;
    }
  },

  async getMonthlyStats() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return {
          totalExpenses: 0,
          totalBudget: 2000,
          remainingBalance: 2000,
        };
      }

      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .eq("created_by", user.id)
        .gte(
          "date",
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString()
        );

      if (error) {
        console.error("Error fetching monthly stats:", error.message);
        throw error;
      }

      const totalExpenses = data.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const totalBudget = 2000; // This should come from user settings
      const remainingBalance = totalBudget - totalExpenses;

      return { totalExpenses, totalBudget, remainingBalance };
    } catch (error) {
      console.error("Error in getMonthlyStats:", error.message);
      throw error;
    }
  },
};
