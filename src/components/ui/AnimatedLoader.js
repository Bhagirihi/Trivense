import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../hooks/useTranslation";
import { radii, spacing, typography } from "../../theme/tokens";

const DEFAULT_MESSAGE_KEYS = [
  "loaderMsg1",
  "loaderMsg2",
  "loaderMsg3",
  "loaderMsg4",
  "loaderMsg5",
  "loaderMsg6",
  "loaderMsg7",
  "loaderMsg8",
];

const CONTEXT_MESSAGE_KEYS = {
  profile: ["loaderProfile1", "loaderProfile2", "loaderMsg3", "loaderMsg5"],
  dashboard: ["loaderHome1", "loaderHome2", "loaderMsg2", "loaderMsg6"],
  expenses: ["loaderExpense1", "loaderExpense2", "loaderMsg1", "loaderMsg4"],
  boards: ["loaderBoard1", "loaderBoard2", "loaderMsg3", "loaderMsg7"],
  analytics: ["loaderAnalytics1", "loaderAnalytics2", "loaderMsg2", "loaderMsg8"],
  settings: ["loaderSettings1", "loaderSettings2", "loaderMsg5", "loaderMsg6"],
  notifications: ["loaderNotify1", "loaderNotify2", "loaderMsg1", "loaderMsg4"],
  settlements: ["loaderSettle1", "loaderSettle2", "loaderMsg3", "loaderMsg8"],
  paywall: ["loaderPaywall1", "loaderPaywall2", "loaderMsg5", "loaderMsg7"],
  categories: ["loaderCategory1", "loaderCategory2", "loaderMsg1", "loaderMsg6"],
  invitations: ["loaderInvite1", "loaderInvite2", "loaderMsg4", "loaderMsg7"],
};

/**
 * Full-screen / section loader with a spinning icon and rotating tips.
 */
export const AnimatedLoader = memo(
  ({
    context = "default",
    messageKeys,
    title,
    style,
    compact = false,
  }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const spin = useRef(new Animated.Value(0)).current;
    const fade = useRef(new Animated.Value(1)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const [index, setIndex] = useState(0);

    const keys = useMemo(() => {
      if (Array.isArray(messageKeys) && messageKeys.length > 0) {
        return messageKeys;
      }
      return CONTEXT_MESSAGE_KEYS[context] || DEFAULT_MESSAGE_KEYS;
    }, [context, messageKeys]);

    const messages = useMemo(
      () => keys.map((key) => t(key)).filter(Boolean),
      [keys, t]
    );

    useEffect(() => {
      const spinLoop = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      spinLoop.start();
      pulseLoop.start();
      return () => {
        spinLoop.stop();
        pulseLoop.stop();
      };
    }, [spin, pulse]);

    useEffect(() => {
      if (messages.length <= 1) return undefined;
      let cancelled = false;
      const tick = () => {
        Animated.timing(fade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished || cancelled) return;
          setIndex((prev) => (prev + 1) % messages.length);
          Animated.timing(fade, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }).start();
        });
      };
      const id = setInterval(tick, 2400);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }, [fade, messages.length]);

    const rotate = spin.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    const message = messages[index % Math.max(messages.length, 1)] || t("loadingGeneric");

    return (
      <View
        style={[styles.wrap, compact && styles.wrapCompact, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        <Animated.View
          style={[
            styles.iconRing,
            {
              backgroundColor: theme.primaryMuted,
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialCommunityIcons
              name="loading"
              size={compact ? 28 : 36}
              color={theme.primary}
            />
          </Animated.View>
        </Animated.View>

        {title ? (
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        ) : null}

        <Animated.Text
          style={[
            styles.message,
            compact && styles.messageCompact,
            { color: theme.textSecondary, opacity: fade },
          ]}
        >
          {message}
        </Animated.Text>

        <View style={styles.dots}>
          {messages.slice(0, Math.min(messages.length, 4)).map((_, i) => {
            const active = i === index % Math.min(messages.length, 4);
            return (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  {
                    backgroundColor: active
                      ? theme.primary
                      : `${theme.textSecondary}40`,
                    transform: [{ scale: active ? 1.15 : 1 }],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  wrapCompact: {
    flex: 0,
    paddingVertical: spacing.xxl,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: radii.xxl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    textAlign: "center",
  },
  message: {
    ...typography.body,
    textAlign: "center",
    maxWidth: 280,
    minHeight: 48,
    lineHeight: 22,
  },
  messageCompact: {
    ...typography.caption,
    minHeight: 36,
    lineHeight: 18,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default AnimatedLoader;
