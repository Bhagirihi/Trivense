import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { radii } from "../theme/tokens";

const ThemeToggle = ({ compact = false, tone = "default" }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const onDark = tone === "onDark";
  const size = compact ? 32 : 36;

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          backgroundColor: onDark
            ? "rgba(255,255,255,0.12)"
            : theme.primaryMuted,
        },
      ]}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name={isDarkMode ? "weather-sunny" : "moon-waning-crescent"}
        size={compact ? 18 : 20}
        color={onDark ? theme.headerText || "#FFFFFF" : theme.primary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ThemeToggle;
