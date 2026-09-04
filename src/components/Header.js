import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { layout, radii, spacing, typography } from "../theme/tokens";

export const HEADER_MIN_HEIGHT = layout.headerHeight;

/**
 * Stack / detail screen header — navy theme chrome with clear back affordance.
 */
export const Header = ({
  title,
  onBack,
  rightComponent,
  showBack = true,
  titleStyle,
  containerStyle,
  variant = "default",
}) => {
  const { theme } = useTheme();
  const isLarge = variant === "large";
  const bg = theme.headerBackground || theme.primary;
  const fg = theme.headerText || theme.white;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: bg,
          borderBottomColor: "rgba(255,255,255,0.08)",
        },
        containerStyle,
      ]}
    >
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      <View style={styles.titleSection}>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            isLarge ? styles.titleLarge : styles.title,
            { color: fg },
            titleStyle,
          ]}
        >
          {title}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {rightComponent || <View style={styles.backPlaceholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEADER_MIN_HEIGHT,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: Platform.OS === "android" ? spacing.sm : spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftSection: {
    width: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rightSection: {
    minWidth: 48,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  titleSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  backPlaceholder: { width: 40, height: 40 },
  title: {
    ...typography.h3,
    textAlign: "center",
    width: "100%",
    fontWeight: "700",
  },
  titleLarge: {
    ...typography.h2,
    textAlign: "center",
    width: "100%",
    fontWeight: "700",
  },
});

export default Header;
