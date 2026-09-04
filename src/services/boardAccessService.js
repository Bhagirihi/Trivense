import { supabase } from "../config/supabase";
import { getCurrentUser } from "../utils/supabaseAuth";

const CACHE_MS = 30_000;
let cache = { boardIds: null, summaries: null, at: 0 };

export function invalidateBoardCache() {
  cache = { boardIds: null, summaries: null, at: 0 };
}

function isFresh() {
  return cache.at > 0 && Date.now() - cache.at < CACHE_MS;
}

/** Owned + accepted shared board IDs for the current user. */
export async function getAccessibleBoardIds({ force = false } = {}) {
  if (!force && isFresh() && cache.boardIds) {
    return cache.boardIds;
  }

  const user = await getCurrentUser();
  if (!user) return [];

  const [ownedRes, sharedRes] = await Promise.all([
    supabase.from("expense_boards").select("id").eq("created_by", user.id),
    supabase
      .from("shared_users")
      .select("board_id")
      .eq("user_id", user.id)
      .eq("is_accepted", true),
  ]);

  if (ownedRes.error) throw ownedRes.error;
  if (sharedRes.error) throw sharedRes.error;

  const boardIds = [
    ...new Set([
      ...(ownedRes.data || []).map((b) => b.id),
      ...(sharedRes.data || []).map((s) => s.board_id),
    ]),
  ];

  cache.boardIds = boardIds;
  cache.at = Date.now();
  return boardIds;
}

/**
 * Lightweight board list for dashboard / stats — uses DB total_expense, not full expense rows.
 */
export async function getBoardSummaries({ force = false } = {}) {
  if (!force && isFresh() && cache.summaries) {
    return cache.summaries;
  }

  const user = await getCurrentUser();
  if (!user) return [];

  const userId = user.id;

  const [ownedRes, sharedLinksRes] = await Promise.all([
    supabase
      .from("expense_boards")
      .select(
        "id, name, total_budget, total_expense, created_by, is_default, created_at"
      )
      .eq("created_by", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("shared_users")
      .select("board_id")
      .eq("user_id", userId)
      .eq("is_accepted", true),
  ]);

  if (ownedRes.error) throw ownedRes.error;
  if (sharedLinksRes.error) throw sharedLinksRes.error;

  const ownedBoards = ownedRes.data || [];
  const sharedIds = (sharedLinksRes.data || []).map((l) => l.board_id);

  let sharedBoards = [];
  if (sharedIds.length > 0) {
    const sharedRes = await supabase
      .from("expense_boards")
      .select(
        "id, name, total_budget, total_expense, created_by, is_default, created_at"
      )
      .in("id", sharedIds);

    if (sharedRes.error) throw sharedRes.error;
    sharedBoards = sharedRes.data || [];
  }

  const summaries = [...ownedBoards, ...sharedBoards].map((board) => ({
    ...board,
    totalExpenses: Number(board.total_expense) || 0,
    isShared: board.created_by !== userId,
  }));

  cache.summaries = summaries;
  cache.boardIds = summaries.map((b) => b.id);
  cache.at = Date.now();
  return summaries;
}

/** Transaction counts per board — selects board_id only (not full expense rows). */
export async function getExpenseCountsByBoard(boardIds) {
  if (!boardIds?.length) return {};

  const { data, error } = await supabase
    .from("expenses")
    .select("board_id")
    .in("board_id", boardIds);

  if (error) throw error;

  return (data || []).reduce((acc, row) => {
    acc[row.board_id] = (acc[row.board_id] || 0) + 1;
    return acc;
  }, {});
}
