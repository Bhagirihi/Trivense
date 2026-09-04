import { Platform } from "react-native";

/** Design tokens — spacing, radii, typography, motion */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const typography = {
  hero: { fontSize: 32, fontWeight: "700", letterSpacing: -0.5 },
  h1: { fontSize: 28, fontWeight: "700", letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: "700", letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 16, fontWeight: "400" },
  bodyMedium: { fontSize: 16, fontWeight: "500" },
  caption: { fontSize: 13, fontWeight: "500" },
  micro: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4 },
  label: { fontSize: 14, fontWeight: "600" },
};

export const layout = {
  screenPadding: Platform.OS === "android" ? 16 : 20,
  cardPadding: Platform.OS === "android" ? 12 : 16,
  headerHeight: 56,
  tabBarHeight: Platform.OS === "android" ? 56 : 64,
};

/** Scroll content padding when a footer tab bar is visible */
export function footerScrollPadding(bottomInset = 0) {
  return layout.tabBarHeight + bottomInset + spacing.sm;
}

/**
 * Brand palette — fintech reference (dark header, navy accent, white body).
 * Primary accent: #003D66 · Header: #000000 · Body: #FFFFFF · Muted text: #888888
 */
export const brand = {
  light: {
    primary: "#003D66",
    primaryDark: "#002847",
    primaryMuted: "#E8EEF3",
    accent: "#003D66",
    accentMuted: "#D6E4ED",
    coral: "#F97316",
    headerBackground: "#003D66",
    headerText: "#FFFFFF",
    headerTextMuted: "rgba(255, 255, 255, 0.78)",
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceElevated: "#FAFBFC",
    text: "#000000",
    textSecondary: "#888888",
    textMuted: "#AAAAAA",
    border: "#E0E6EC",
    borderLight: "#F0F3F6",
    error: "#E53935",
    success: "#16A34A",
    warning: "#F59E0B",
    info: "#003D66",
    white: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.5)",
    gradient: ["#002847", "#003D66", "#004D80"],
    tabBar: "#FFFFFF",
    tabBarActive: "#003D66",
    tabBarActiveIcon: "#FFFFFF",
    tabBarInactive: "#8899AA",
  },
  dark: {
    primary: "#4A8BB8",
    primaryDark: "#003D66",
    primaryMuted: "#1A2F3D",
    accent: "#4A8BB8",
    accentMuted: "#1A2F3D",
    coral: "#FB923C",
    headerBackground: "#002847",
    headerText: "#FFFFFF",
    headerTextMuted: "rgba(255, 255, 255, 0.78)",
    background: "#000000",
    surface: "#121212",
    surfaceElevated: "#1A1A1A",
    text: "#FFFFFF",
    textSecondary: "#888888",
    textMuted: "#666666",
    border: "#2A2A2A",
    borderLight: "#1A1A1A",
    error: "#EF5350",
    success: "#22C55E",
    warning: "#FBBF24",
    info: "#4A8BB8",
    white: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.72)",
    gradient: ["#000000", "#003D66", "#004D80"],
    tabBar: "#121212",
    tabBarActive: "#4A8BB8",
    tabBarActiveIcon: "#FFFFFF",
    tabBarInactive: "#666666",
  },
};
