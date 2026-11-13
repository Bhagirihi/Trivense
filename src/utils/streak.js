import { Platform } from "react-native";

/**
 * Real expense streak: consecutive days (ending today, or yesterday when
 * nothing is logged yet today) on which the user logged at least one expense.
 * Input: expense created-at values (ISO strings, Dates, or epoch ms).
 * Output: integer days. 0 when there is no expense in the current run.
 * Pure function — unit-tested behaviour lives in the caller, never fake data.
 */
function dayKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function shiftDayKey(key, deltaDays) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + deltaDays);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function computeExpenseStreak(expenseDates, now = new Date()) {
  const days = new Set();
  for (const value of expenseDates || []) {
    const key = dayKey(value);
    if (key) days.add(key);
  }
  if (days.size === 0) return 0;

  const today = dayKey(now);
  // Anchor on today if an expense exists today, otherwise yesterday.
  let cursor = days.has(today) ? today : shiftDayKey(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

/** Local-day key helper for callers that need it (kept tiny on purpose). */
export function toDayKey(value) {
  return dayKey(value);
}

export const IS_IOS = Platform.OS === "ios";
