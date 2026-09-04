import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "@trivense/onboarding_complete";

export async function isOnboardingComplete() {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
  return value === "true";
}

export async function setOnboardingComplete() {
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
}
