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
 * Kinetic Financial Neo-System tokens (Stitch redesign, 2026-11-13).
 * Source of truth: trivense_handoff_token_specifications.md + kinetic DESIGN.md.
 * PALETTE DECISION (live-review conflict 1): Handoff palette wins —
 * navy #003D66, coral #F97316 → #EA580C. Never #0F2B46 / #FF6B2C.
 * These are ADDITIVE — every export above stays as-is for existing callers.
 */
export const kinetic = {
  colors: {
    navy: "#003D66",
    navyDark: "#002844",
    navyLight: "#0A5585",
    coral: "#F97316",
    coralLight: "#FB923C",
    coralDark: "#EA580C",
    success: "#16A34A",
    whatsapp: "#25D366",
    whatsappDark: "#128C7E",
    warning: "#D97706",
    danger: "#DC2626",
    upiBlue: "#0284C7",
    canvas: "#F8FAFC",
    card: "#FFFFFF",
    subtle: "#F1F5F9",
    tintBlue: "#EFF6FF",
    tintGreen: "#F0FDF4",
    tintAmber: "#FFFBEB",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textTertiary: "#94A3B8",
    textInverse: "#FFFFFF",
    textPositive: "#15803D",
    textNegative: "#B91C1C",
    heroGradient: ["#002847", "#003D66", "#004D80"],
    coralGradient: ["#FB923C", "#EA580C"],
    whatsappGradient: ["#25D366", "#128C7E"],
  },
  fonts: {
    jakartaRegular: "PlusJakartaSans_400Regular",
    jakartaMedium: "PlusJakartaSans_500Medium",
    jakartaSemiBold: "PlusJakartaSans_600SemiBold",
    jakartaBold: "PlusJakartaSans_700Bold",
    jakartaExtraBold: "PlusJakartaSans_800ExtraBold",
    interRegular: "Inter_Regular",
    interMedium: "Inter_Medium",
    interBold: "Inter_Bold",
  },
  typography: {
    displayLarge: {
      fontFamily: "PlusJakartaSans_800ExtraBold",
      fontSize: 32,
      lineHeight: 38,
    },
    displayMedium: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 24,
      lineHeight: 30,
    },
    headingLarge: {
      fontFamily: "PlusJakartaSans_700Bold",
      fontSize: 20,
      lineHeight: 26,
    },
    headingMedium: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 17,
      lineHeight: 22,
    },
    headingSmall: {
      fontFamily: "PlusJakartaSans_600SemiBold",
      fontSize: 15,
      lineHeight: 20,
    },
    body: { fontFamily: "Inter_Regular", fontSize: 14, lineHeight: 20 },
    bodyMedium: { fontFamily: "Inter_Medium", fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: "Inter_Medium", fontSize: 12, lineHeight: 16 },
    captionBold: { fontFamily: "Inter_Bold", fontSize: 11, lineHeight: 14 },
  },
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  spacing: {
    "2xs": 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
  },
  shadows: {
    card: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    ctaCoral: {
      shadowColor: "#F97316",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 6,
    },
    ctaWhatsapp: {
      shadowColor: "#25D366",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    elevated: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 25,
      elevation: 8,
    },
  },
  /** Gauge fill by budget usage: <70% green, 70–90% amber, >90% red. */
  gaugeColor(usagePercent) {
    const p = Number(usagePercent) || 0;
    if (p >= 90) return "#E53935";
    if (p >= 70) return "#F59E0B";
    return "#16A34A";
  },
};

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
