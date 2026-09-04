import { Platform } from "react-native";
import { supabase } from "../config/supabase";
import { getCurrentUser } from "../utils/supabaseAuth";
import {
  getExpenseCountsByBoard,
  invalidateBoardCache,
} from "./boardAccessService";

export { invalidateBoardCache };

export const expenseBoardService = {
  async getExpenseBoards() {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No authenticated user");

      const userId = user.id;

      const [ownedBoardsRes, sharedLinksRes] = await Promise.all([
        supabase
          .from("expense_boards")
          .select("*, profiles:created_by ( id, full_name, email_address )")
          .eq("created_by", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("shared_users")
          .select("*")
          .eq("user_id", userId)
          .eq("is_accepted", true),
      ]);

      if (ownedBoardsRes.error) throw ownedBoardsRes.error;
      if (sharedLinksRes.error) throw sharedLinksRes.error;

      const ownedBoards = ownedBoardsRes.data || [];
      const sharedBoardLinks = sharedLinksRes.data || [];
      const sharedBoardIds = sharedBoardLinks.map((link) => link.board_id);

      let sharedBoardsData = [];
      if (sharedBoardIds.length > 0) {
        const sharedBoardsRes = await supabase
          .from("expense_boards")
          .select("*, profiles:created_by ( id, full_name, email_address )")
          .in("id", sharedBoardIds)
          .order("created_at", { ascending: false });

        if (sharedBoardsRes.error) throw sharedBoardsRes.error;
        sharedBoardsData = sharedBoardsRes.data || [];
      }

      const allBoards = [...ownedBoards, ...sharedBoardsData];
      if (allBoards.length === 0) return [];

      const boardIds = allBoards.map((b) => b.id);
      const expenseCounts = await getExpenseCountsByBoard(boardIds);

      const boardsWithExpenses = allBoards
        .map((board) => {
          const ownerId = board.created_by;
          const ownerProfile = board.profiles;
          const totalExpenses = Number(board.total_expense) || 0;

          return {
            ...board,
            created_by:
              ownerProfile?.id === user.id
                ? "You"
                : ownerProfile?.full_name || "Shared board",
            expenses: [],
            totalExpenses,
            totalTransactions: expenseCounts[board.id] || 0,
            isShared: ownerId !== userId,
          };
        })
        .sort((a, b) => {
          if (a.is_default) return -1;
          if (b.is_default) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });

      return boardsWithExpenses;
    } catch (error) {
      console.error("Error fetching boards and expenses:", error.message);
      throw error;
    }
  },

  async getExpenseBoardsByID(id) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No authenticated user");

      const [expensesRes, boardRes, sharedUsersRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("board_id", id),
        supabase.from("expense_boards").select("*").eq("id", id),
        supabase
          .from("shared_users")
          .select(
            `
      *,
      board_id,
          shared_by_profile:profiles!shared_users_shared_by_fkey(*),
          user_profile:profiles!shared_users_user_id_fkey(*)
        `
          )
          .eq("board_id", id),
      ]);

      const boardUsers = [];
      const seenUserIds = new Set();

      const addBoardUser = (profile) => {
        if (!profile?.id || seenUserIds.has(profile.id)) return;
        seenUserIds.add(profile.id);
        boardUsers.push({
          id: profile.id,
          name: profile.full_name || profile.email_address || "Member",
          board_id: profile.board_id,
          email: profile.email_address,
        });
      };

      if (sharedUsersRes.data?.length > 0) {
        sharedUsersRes.data.forEach((item) => {
          addBoardUser(item.user_profile);
          addBoardUser(item.shared_by_profile);
        });
      }

      if (boardUsers.length === 0) {
        addBoardUser({
          id: user.id,
          full_name: user.user_metadata?.full_name,
          board_id: id,
          email_address: user.email,
        });
      }

      const userExpenseMap = {};
      (expensesRes.data || []).forEach((expense) => {
        if (!userExpenseMap[expense.created_by]) {
          userExpenseMap[expense.created_by] = 0;
        }
        userExpenseMap[expense.created_by] += expense.amount;
      });

      if (expensesRes.error || boardRes.error || sharedUsersRes.error) {
        throw expensesRes.error || boardRes.error || sharedUsersRes.error;
      }

      const expenses = expensesRes.data || [];
      const board = boardRes.data?.[0];

      if (!board) return [];

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const perPersonBudget = totalExpenses / boardUsers.length;

      // 3. Map to boardUsers with percentage
      const boardUsersWithStats = boardUsers.map((user) => {
        const userTotal = userExpenseMap[user.id] || 0;
        const percent =
          totalExpenses > 0
            ? ((userTotal / totalExpenses) * 100).toFixed(2)
            : "0.00";

        return {
          ...user,
          spent: userTotal,
          percentage: percent,
        };
      });

      const fairShare = totalExpenses / boardUsersWithStats.length;
      const creditors = [];
      const debtors = [];

      boardUsersWithStats.forEach((member) => {
        const difference = member.spent - fairShare;
        if (difference > 0) {
          creditors.push({ ...member, amount: difference });
        } else if (difference < 0) {
          debtors.push({ ...member, amount: -difference });
        }
      });

      const settlements = [];
      for (const debtor of debtors) {
        let amountToSettle = debtor.amount;
        for (const creditor of creditors) {
          if (amountToSettle === 0) break;
          if (creditor.amount === 0) continue;
          const settleAmount = Math.min(amountToSettle, creditor.amount);
          settlements.push({
            from: debtor.name,
            to: creditor.name,
            amount: Number(settleAmount.toFixed(2)),
          });
          amountToSettle -= settleAmount;
          creditor.amount -= settleAmount;
        }
      }

      return {
        totalBudget: board.total_budget,
        perPersonBudget: perPersonBudget || "0", // fallback
        totalExpenses,
        participants: boardUsersWithStats || [],
        settlements: settlements || [],
      };
    } catch (error) {
      console.error("Error fetching board by ID:", error.message);
      throw error;
    }
  },

  async createExpenseBoard(boardData) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("expense_boards")
        .insert([
          {
            name: boardData.name,
            description: boardData.description || null,
            board_color: boardData.color,
            board_icon: boardData.icon,
            created_by: user.id,
            created_at: new Date().toISOString(),
            total_budget: boardData.total_budget,
            share_code: boardData.share_code,
          },
        ])
        .select()
        .single();

      if (error) return { data: null, error };
      invalidateBoardCache();
      return { data, error: null };
    } catch (error) {
      console.error("Error creating expense board:", error);
      return {
        data: null,
        error: error?.message ? { message: error.message } : error,
      };
    }
  },

  async updateExpenseBoard(id, boardData) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("expense_boards")
        .update({
          name: boardData.name,
          description: boardData.description,
          board_color: boardData.color,
          board_icon: boardData.icon,
          total_budget: boardData.total_budget,
          share_code: boardData.share_code,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) throw error;
      invalidateBoardCache();
      return data;
    } catch (error) {
      console.error("Error updating expense board:", error);
      throw error;
    }
  },

  async deleteExpenseBoard(id) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("expense_boards")
        .delete()
        .eq("id", id)
        .eq("created_by", user.id);

      if (error) throw error;
      invalidateBoardCache();
      return true;
    } catch (error) {
      console.error("Error deleting expense board:", error);
      throw error;
    }
  },

  async getSharedMembers() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("shared_users")
        .select("*")
        .eq("shared_by", user.id);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching shared members:", error);
      throw error;
    }
  },

  async getBoardShareCode(boardId) {
    const { data, error } = await supabase
      .from("expense_boards")
      .select("share_code")
      .eq("id", boardId)
      .maybeSingle();

    if (error) throw error;
    return data?.share_code || null;
  },

  async shareBoardWithEmail(boardId, email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Please enter a valid email address");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    if (user.email?.toLowerCase() === normalizedEmail) {
      throw new Error("You cannot share a board with yourself");
    }

    const { data: board, error: boardError } = await supabase
      .from("expense_boards")
      .select("id, name, created_by")
      .eq("id", boardId)
      .eq("created_by", user.id)
      .maybeSingle();

    if (boardError) throw boardError;
    if (!board) throw new Error("Board not found or you are not the owner");

    const { data: existing } = await supabase
      .from("shared_users")
      .select("id, is_accepted")
      .eq("board_id", boardId)
      .eq("shared_with", normalizedEmail)
      .maybeSingle();

    if (existing?.is_accepted) {
      throw new Error("This user already has access to the board");
    }
    if (existing) {
      throw new Error("An invitation is already pending for this email");
    }

    const { data: inviteeProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email_address", normalizedEmail)
      .maybeSingle();

    const { data, error } = await supabase
      .from("shared_users")
      .insert([
        {
          shared_by: user.id,
          shared_with: normalizedEmail,
          board_id: boardId,
          user_id: inviteeProfile?.id || null,
          is_accepted: false,
          status: "pending",
        },
      ])
      .select(
        `
        *,
        expense_boards:board_id (name)
      `
      )
      .single();

    if (error) throw error;
    return data;
  },

  async joinBoard(codeOrUrl) {
    const raw = (codeOrUrl || "").trim();
    if (!raw) throw new Error("Please enter an invite code or URL");

    const code = raw.includes("/") ? raw.split("/").pop() : raw;

    const { data, error } = await supabase.rpc("join_expense_board", {
      p_code: code,
    });

    if (error) throw error;
    return data;
  },

  async getSentInvitations() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const { data, error } = await supabase
      .from("shared_users")
      .select(
        `
        *,
        profiles:user_id (id, full_name, email_address),
        expense_boards:board_id (id, name)
      `
      )
      .eq("shared_by", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getReceivedInvitations() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const email = user.email?.toLowerCase();
    if (!email) throw new Error("No email on account");

    const { data, error } = await supabase
      .from("shared_users")
      .select(
        `
        *,
        shared_by_profile:profiles!shared_users_shared_by_fkey (id, full_name, email_address),
        expense_boards:board_id (id, name)
      `
      )
      .or(`user_id.eq.${user.id},shared_with.eq.${email}`)
      .neq("shared_by", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async acceptInvitation(sharedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const { data, error } = await supabase
      .from("shared_users")
      .update({
        user_id: user.id,
        is_accepted: true,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", sharedUserId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async rejectInvitation(sharedUserId) {
    const { error } = await supabase
      .from("shared_users")
      .update({
        is_accepted: false,
        status: "rejected",
      })
      .eq("id", sharedUserId);

    if (error) throw error;
    return true;
  },

  async removeSharedUser(sharedUserId) {
    const { error } = await supabase
      .from("shared_users")
      .delete()
      .eq("id", sharedUserId);

    if (error) throw error;
    return true;
  },
};
