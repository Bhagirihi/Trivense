import AsyncStorage from "@react-native-async-storage/async-storage";

const COMPLETED_TOURS_KEY = "@trivense/app_cues_completed";

async function readCompleted() {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_TOURS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function isTourCompleted(tourId) {
  const completed = await readCompleted();
  return completed.includes(tourId);
}

export async function markTourCompleted(tourId) {
  const completed = await readCompleted();
  if (completed.includes(tourId)) return;
  await AsyncStorage.setItem(
    COMPLETED_TOURS_KEY,
    JSON.stringify([...completed, tourId]),
  );
}

export async function resetTour(tourId) {
  const completed = (await readCompleted()).filter((id) => id !== tourId);
  await AsyncStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(completed));
}

export async function resetAllTours() {
  await AsyncStorage.removeItem(COMPLETED_TOURS_KEY);
}
