import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { brand } from "../theme/tokens";
import { shadowStyle } from "../utils/platformStyles";

const buildTheme = (palette, isDark) => ({
  ...palette,
  isDark,
  card: palette.surface,
  cardBackground: palette.surfaceElevated,
  primaryLight: palette.primaryMuted,
  textLight: palette.textMuted,
  borderLight: palette.borderLight,
  inputBackground: isDark ? palette.surfaceElevated : palette.borderLight,
  shadow: shadowStyle(3),
  overlay: palette.overlay,
  inviteCard: {
    background: palette.surface,
    border: palette.border,
    shadow: "#000000",
  },
  avatar: { text: "#FFFFFF", shadow: "#000000" },
  badge: {
    member: { background: isDark ? "#064E3B" : "#DCFCE7", text: isDark ? "#34D399" : "#16A34A" },
    invited: { background: isDark ? "#1E3A8A" : "#DBEAFE", text: isDark ? "#60A5FA" : "#2563EB" },
    admin: { background: isDark ? "#5B21B6" : "#F3E8FF", text: isDark ? "#A78BFA" : "#7C3AED" },
    board: { background: isDark ? "#1E293B" : "#F1F5F9", text: palette.textSecondary },
  },
  button: {
    accept: { background: palette.success, text: "#FFFFFF" },
    reject: { background: palette.error, text: "#FFFFFF" },
  },
  checkmark: {
    background: palette.surface,
    icon: palette.success,
    shadow: "#000000",
  },
  errorLight: isDark ? "#7F1D1D" : "#FEE2E2",
  secondary: palette.accent,
  info: palette.info,
});

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme !== null) setIsDarkMode(savedTheme === "dark");
    } catch (error) {
      console.error("Error loading theme preference:", error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem("theme", newTheme ? "dark" : "light");
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const theme = useMemo(
    () => buildTheme(isDarkMode ? brand.dark : brand.light, isDarkMode),
    [isDarkMode]
  );

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
