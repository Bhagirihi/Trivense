import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import FooterTab from "./FooterTab";
import AdBanner from "./AdBanner";

/**
 * Standard screen shell: themed top chrome + content + optional footer tab.
 * Brand chrome paints one continuous navy block under the status bar + header.
 */
export function ScreenLayout({
  children,
  header = null,
  navigation,
  footerRoute = null,
  showAdBanner = true,
  style,
  contentStyle,
  headerChrome = undefined,
}) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const screenTestId = footerRoute
    ? `screen-${String(footerRoute).toLowerCase()}`
    : undefined;

  const useBrandChrome =
    headerChrome !== undefined
      ? headerChrome
      : Boolean(header || footerRoute);
  const topBg = useBrandChrome
    ? theme.headerBackground || theme.primary
    : theme.background;

  return (
    <View
      testID={screenTestId}
      style={[styles.root, { backgroundColor: theme.background }, style]}
    >
      <StatusBar style={useBrandChrome || isDarkMode ? "light" : "dark"} />

      {useBrandChrome ? (
        <View style={{ backgroundColor: topBg, paddingTop: insets.top }}>
          {header}
        </View>
      ) : (
        <SafeAreaView edges={["top"]} style={{ backgroundColor: topBg }}>
          {header}
        </SafeAreaView>
      )}

      <SafeAreaView style={styles.safeBody} edges={["left", "right"]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>

      {footerRoute && showAdBanner ? <AdBanner /> : null}
      {footerRoute ? (
        <FooterTab navigation={navigation} activeRoute={footerRoute} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeBody: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default ScreenLayout;
