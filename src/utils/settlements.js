/**
 * Money math for Trivense boards — integer-paise arithmetic only.
 *
 * Why this module exists: the old board-settlement code summed float
 * rupees (0.1 + 0.2 style drift) and rounded each settlement to 2 decimals
 * only at display time, while mutating the unrounded balances. The
 * settlements a user saw could therefore be a paise or two short of what
 * debtors actually owed, and the rounding error had nowhere to go.
 *
 * Rules enforced here, all in paise (1 rupee = 100 paise):
 * - Every amount must be a finite, non-negative number. Negative, NaN,
 *   infinite and non-numeric amounts throw — a bad expense row must fail
 *   loudly instead of silently warping everyone's balances.
 * - The fair share is distributed exactly: base = floor(total / n) paise
 *   each, and the leftover (total % n) paise go one each to the first
 *   `leftover` members in the order given, so the fair shares always sum
 *   to the total and the balances always sum to zero.
 * - Settlements are greedy in paise: each debtor pays creditors in order
 *   until their balance is exactly zero. No settlement is ever 0 paise,
 *   and the settlements always sum to the total positive balance.
 * - An expense whose creator is not in `members` still counts: that
 *   creator is added as a participant (name falls back to "Member"), so
 *   the total can never exceed the sum of what participants spent.
 *
 * This module is pure (no React Native, no Supabase) so it is unit-testable
 * in plain Jest. See tests/unit/settlements.test.js.
 */

/** Convert a rupee amount to integer paise, rounding to the nearest paise. */
export function toPaise(amount) {
  const value =
    typeof amount === "string" && amount.trim() !== ""
      ? Number(amount)
      : amount;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid expense amount: ${String(amount)}`);
  }
  return Math.round(value * 100);
}

/** Convert integer paise back to a rupee number with exactly 2 decimals. */
export function fromPaise(paise) {
  return Number((paise / 100).toFixed(2));
}

function toPercent(spentPaise, totalPaise) {
  if (totalPaise <= 0) return "0.00";
  return ((spentPaise / totalPaise) * 100).toFixed(2);
}

/**
 * Compute who-owes-whom for one board.
 *
 * @param {Object} input
 * @param {Array<{id: string, name?: string, upiId?: string|null}>} input.members
 * @param {Array<{created_by?: string, memberId?: string, amount: number}>} input.expenses
 * @returns {{
 *   totalPaise: number,
 *   totalExpenses: number,
 *   participants: Array<{
 *     id: string, name: string, upiId: string|null,
 *     spent: number, spentPaise: number,
 *     fairShare: number, fairSharePaise: number,
 *     balancePaise: number, percentage: string
 *   }>,
 *   settlements: Array<{
 *     from: string, to: string, fromId: string, toId: string,
 *     toUpi: string|null, amount: number, amountPaise: number
 *   }>
 * }}
 */
export function computeBoardSettlements({ members = [], expenses = [] } = {}) {
  const byId = new Map();
  const ordered = [];

  const addMember = (member) => {
    if (!member?.id || byId.has(member.id)) return byId.get(member.id);
    // Keep any extra caller fields (email, mobile, board_id, ...) so the
    // participant shape stays a superset of what callers already received.
    const { id, name, upiId, ...rest } = member;
    const entry = {
      ...rest,
      id,
      name: name || "Member",
      upiId: upiId ?? null,
      spentPaise: 0,
    };
    byId.set(member.id, entry);
    ordered.push(entry);
    return entry;
  };

  for (const member of members) addMember(member);

  let totalPaise = 0;
  for (const expense of expenses || []) {
    const creatorId = expense?.created_by ?? expense?.memberId;
    if (!creatorId) continue;
    const paise = toPaise(expense.amount);
    totalPaise += paise;
    addMember({ id: creatorId }).spentPaise += paise;
  }

  const n = ordered.length;
  if (n === 0) {
    return { totalPaise: 0, totalExpenses: 0, participants: [], settlements: [] };
  }

  // Exact fair-share distribution: the leftover paise go to the first
  // `remainder` members, so sum(fairSharePaise) === totalPaise always.
  const base = Math.floor(totalPaise / n);
  const remainder = totalPaise - base * n;

  const participants = ordered.map((member, index) => {
    const fairSharePaise = base + (index < remainder ? 1 : 0);
    const { spentPaise, ...extra } = member;
    return {
      ...extra,
      id: member.id,
      name: member.name,
      upiId: member.upiId,
      spent: fromPaise(member.spentPaise),
      spentPaise: member.spentPaise,
      fairShare: fromPaise(fairSharePaise),
      fairSharePaise,
      balancePaise: member.spentPaise - fairSharePaise,
      percentage: toPercent(member.spentPaise, totalPaise),
    };
  });

  const creditors = participants
    .filter((p) => p.balancePaise > 0)
    .map((p) => ({ ...p, remainingPaise: p.balancePaise }));
  const debtors = participants.filter((p) => p.balancePaise < 0);

  const settlements = [];
  for (const debtor of debtors) {
    let toSettlePaise = -debtor.balancePaise;
    for (const creditor of creditors) {
      if (toSettlePaise === 0) break;
      if (creditor.remainingPaise === 0) continue;
      const amountPaise = Math.min(toSettlePaise, creditor.remainingPaise);
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        fromId: debtor.id,
        toId: creditor.id,
        toUpi: creditor.upiId,
        amount: fromPaise(amountPaise),
        amountPaise,
      });
      toSettlePaise -= amountPaise;
      creditor.remainingPaise -= amountPaise;
    }
  }

  return {
    totalPaise,
    totalExpenses: fromPaise(totalPaise),
    participants,
    settlements,
  };
}
