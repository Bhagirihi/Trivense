import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  board: "@trivense/last_expense_board",
  category: "@trivense/last_expense_category",
  payment: "@trivense/last_expense_payment",
};

export async function getExpenseDefaults() {
  try {
    const [board, category, payment] = await Promise.all([
      AsyncStorage.getItem(KEYS.board),
      AsyncStorage.getItem(KEYS.category),
      AsyncStorage.getItem(KEYS.payment),
    ]);
    return {
      board: board || null,
      category: category || null,
      payment: payment || "cash",
    };
  } catch {
    return { board: null, category: null, payment: "cash" };
  }
}

export async function saveExpenseDefaults({ board, category, payment }) {
  try {
    const ops = [];
    if (board) ops.push(AsyncStorage.setItem(KEYS.board, String(board)));
    if (category) ops.push(AsyncStorage.setItem(KEYS.category, String(category)));
    if (payment) ops.push(AsyncStorage.setItem(KEYS.payment, String(payment)));
    await Promise.all(ops);
  } catch {
    // ignore persistence failures
  }
}
