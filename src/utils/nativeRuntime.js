import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/** True when running inside the Expo Go client (no custom native modules). */
export function isExpoGo() {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/** True on iOS/Android dev or release builds that include custom native code. */
export function hasCustomNativeModules() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  return !isExpoGo();
}
