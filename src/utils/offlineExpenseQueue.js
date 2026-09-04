import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { expenseService } from "../services/expenseService";
import { showToast } from "./toast";

const QUEUE_KEY = "@trivense/offline_expense_queue";

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function isDeviceOffline() {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}

export async function enqueueOfflineExpense(expensePayload) {
  const queue = await readQueue();
  const item = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    payload: expensePayload,
  };
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function getOfflineExpenseCount() {
  const queue = await readQueue();
  return queue.length;
}

let flushing = false;

/** Push queued expenses when back online. Returns number synced. */
export async function flushOfflineExpenseQueue() {
  if (flushing) return 0;
  if (await isDeviceOffline()) return 0;

  flushing = true;
  try {
    const queue = await readQueue();
    if (!queue.length) return 0;

    const remaining = [];
    let synced = 0;

    for (const item of queue) {
      try {
        await expenseService.createExpense(item.payload);
        synced += 1;
      } catch {
        remaining.push(item);
      }
    }

    await writeQueue(remaining);

    if (synced > 0) {
      showToast.success(
        synced === 1 ? "Offline expense synced" : `${synced} offline expenses synced`
      );
    }
    return synced;
  } finally {
    flushing = false;
  }
}
