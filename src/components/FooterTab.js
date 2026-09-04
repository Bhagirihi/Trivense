import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { layout, radii, spacing, typography } from "../theme/tokens";

const TABS = [
  { key: "Home", route: "Dashboard", icon: "home-variant", iconOutline: "home-variant-outline", labelKey: "home" },
  { key: "Analytics", route: "Analytics", icon: "chart-box", iconOutline: "chart-box-outline", labelKey: "analytics" },
  { key: "Profile", route: "Profile", icon: "account-circle", iconOutline: "account-circle-outline", labelKey: "profile" },
  { key: "Settings", route: "Settings", icon: "cog", iconOutline: "cog-outline", labelKey: "settings" },
];

const FooterTab = ({ navigation, activeRoute = "Home" }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}
    >
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = activeRoute === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              testID={`footer-tab-${tab.key}`}
              accessibilityLabel={t(tab.labelKey)}
              style={styles.tabItem}
              onPress={() => {
                if (tab.key === "Profile") {
                  navigation.navigate(tab.route, { tabRoot: true });
                  return;
                }
                navigation.navigate(tab.route);
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconWrap,
                  isActive && {
                    backgroundColor: theme.tabBarActive,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isActive ? tab.icon : tab.iconOutline}
                  size={22}
                  color={
                    isActive
                      ? theme.tabBarActiveIcon ?? theme.white
                      : theme.tabBarInactive
                  }
                />
              </View>
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? theme.tabBarActive : theme.tabBarInactive },
                  isActive && styles.tabTextActive,
                ]}
              >
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 6 : spacing.sm,
    paddingBottom: Platform.OS === "android" ? 4 : spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: layout.tabBarHeight,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Platform.OS === "android" ? 0 : 2,
  },
  iconWrap: {
    width: Platform.OS === "android" ? 40 : 44,
    height: Platform.OS === "android" ? 28 : 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { ...typography.micro, fontSize: 10 },
  tabTextActive: { fontWeight: "700" },
});

export default FooterTab;
