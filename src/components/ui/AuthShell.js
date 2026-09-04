import React, { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../context/ThemeContext";
import { layout, radii, spacing, typography } from "../../theme/tokens";
import BrandLockup from "../BrandLockup";

const COMPACT_HEIGHT = 760;
/** Card pulls onto the hero curve; brand padding absorbs the overlap. */
const CARD_OVERLAP = spacing.xl;

export function AuthShell({
  title,
  subtitle,
  children,
  footer = null,
  testID,
  compact: compactProp,
  showSubtitle = true,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef(null);
  const compact = compactProp ?? windowHeight < COMPACT_HEIGHT;
  const [brandHeight, setBrandHeight] = useState(96);

  const bottomPad =
    Math.max(insets.bottom, spacing.sm) + (compact ? spacing.xl : spacing.lg);

  const handleScrollOnKeyboard = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const onBrandLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setBrandHeight(h);
  }, []);

  const heroHeight = brandHeight + insets.top + CARD_OVERLAP;

  return (
    <View
      testID={testID}
      style={[styles.root, { backgroundColor: theme.background }]}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.heroBand, { height: heroHeight }]}
      />
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            bounces={false}
            onContentSizeChange={handleScrollOnKeyboard}
          >
            <View
              onLayout={onBrandLayout}
              style={[
                styles.brandBlock,
                { paddingBottom: spacing.xl + CARD_OVERLAP },
              ]}
            >
              <BrandLockup size={compact ? "md" : "lg"} color={theme.white} />
            </View>

            <View
              style={[
                styles.card,
                compact && styles.cardCompact,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  marginTop: -CARD_OVERLAP,
                },
              ]}
            >
              {title ? (
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {title}
                </Text>
              ) : null}
              {showSubtitle && subtitle ? (
                <Text
                  style={[styles.cardIntro, { color: theme.textSecondary }]}
                >
                  {subtitle}
                </Text>
              ) : null}

              {children}

              {footer ? (
                <View
                  style={[
                    styles.inCardFooter,
                    compact && styles.inCardFooterCompact,
                    { borderTopColor: theme.border },
                  ]}
                >
                  {footer}
                </View>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1 },
  heroBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
  },
  scroll: {
    flexGrow: 1,
  },
  brandBlock: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  cardTitle: {
    ...typography.h2,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.25,
    marginBottom: spacing.xs,
  },
  cardIntro: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    marginBottom: spacing.lg,
  },
  inCardFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inCardFooterCompact: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  card: {
    marginHorizontal: layout.screenPadding,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  cardCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderRadius: radii.lg,
  },
});

export default AuthShell;
