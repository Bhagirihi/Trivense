import { Platform } from "react-native";

/**
 * iOS-only shadow styles. Returns an empty object on Android (no elevation).
 */
export function shadowStyle(level = 2) {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: Math.max(1, Math.round(level / 2)) },
      shadowOpacity: 0.06 + level * 0.02,
      shadowRadius: level + 1,
    },
    android: {},
    default: {},
  });
}

export const noAndroidShadow = shadowStyle;
