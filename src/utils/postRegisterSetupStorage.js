import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_KEY = "@trivense/post_register_setup_pending";
const COMPLETE_PREFIX = "@trivense/post_register_setup_complete:";

export async function markPostRegisterSetupPending() {
  await AsyncStorage.setItem(PENDING_KEY, "1");
}

export async function clearPostRegisterSetupPending() {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function isPostRegisterSetupPending() {
  const value = await AsyncStorage.getItem(PENDING_KEY);
  return value === "1";
}

function completeKey(userId) {
  return `${COMPLETE_PREFIX}${userId}`;
}

export async function isPostRegisterSetupComplete(userId) {
  if (!userId) return false;
  const value = await AsyncStorage.getItem(completeKey(userId));
  return value === "1";
}

export async function shouldShowPostRegisterSetup(userId) {
  if (!userId) return false;
  if (await isPostRegisterSetupComplete(userId)) return false;
  return isPostRegisterSetupPending();
}

export async function setPostRegisterSetupComplete(userId) {
  if (!userId) return;
  await AsyncStorage.setItem(completeKey(userId), "1");
  await clearPostRegisterSetupPending();
}
