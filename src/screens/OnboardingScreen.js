import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BrandLogo } from "../components/BrandLogo";
import { AiSparkleIcon, UpiLightningIcon } from "../components/kinetic/SettlementIcons";
import { useTranslation } from "../hooks/useTranslation";
import { setOnboardingComplete } from "../utils/onboardingStorage";
import { kinetic, layout, spacing } from "../theme/tokens";

const { width } = Dimensions.get("window");
const K = kinetic.colors;

/**
 * Kinetic onboarding — 3 slides (copy per redesign brief; literal English,
 * no i18n keys exist for this copy yet). Flow unchanged: Skip / Get Started
 * mark onboarding complete and route to Login (or Dashboard as before).
 */
const SLIDES = [
  {
    key: "split",
    title: "Split expenses, not friendships",
    subtitle:
      "Track shared expenses with friends, family and flatmates in one place.",
    chips: ["Friends", "Family", "Flatmates"],
  },
  {
    key: "settle",
    title: "Settle in one tap",
    subtitle: "Pay via UPI and mark settlements as done instantly.",
    chips: ["GPay", "PhonePe", "BHIM", "Paytm"],
  },
  {
    key: "insights",
    title: "Smart insights",
    subtitle: "See where your money goes with beautiful analytics.",
    chips: ["Budgets", "Analytics", "Trends"],
  },
];

function SlideIcon({ slideKey }) {
  if (slideKey === "settle") return <UpiLightningIcon size={56} />;
  if (slideKey === "insights") return <AiSparkleIcon size={56} />;
  return (
    <MaterialCommunityIcons name="account-group" size={56} color={K.textInverse} />
  );
}

export const OnboardingScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await setOnboardingComplete();
      const routeNames = navigation.getState()?.routeNames || [];
      if (routeNames.includes("Login")) {
        navigation.replace("Login");
        return;
      }
      navigation.replace("Dashboard");
    } finally {
      setFinishing(false);
    }
  };

  const onNext = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={K.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.iconCircle}>
          <SlideIcon slideKey={item.key} />
        </View>
        <Text style={styles.heroTitle}>{item.title}</Text>
        <Text style={styles.heroSubtitle}>{item.subtitle}</Text>
      </LinearGradient>
      <View style={styles.chipsRow}>
        {item.chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const last = index === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <BrandLogo size={40} />
          <Text style={styles.brand}>Trivense</Text>
        </View>
        <TouchableOpacity
          onPress={finish}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel={t("skip")}
        >
          <Text style={styles.skipText}>{t("skip")}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(next);
        }}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? K.coral : K.border,
                  width: i === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={onNext}
          disabled={finishing}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={last ? t("getStarted") : t("next")}
          style={[styles.ctaWrap, finishing && styles.disabled]}
        >
          <LinearGradient
            colors={K.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {finishing ? (
              <ActivityIndicator color={K.textInverse} />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {last ? t("getStarted") : t("next")}
                </Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={K.textInverse}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={finish}
            accessibilityRole="link"
            accessibilityLabel="Log In"
          >
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: K.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.lg,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brand: {
    fontFamily: kinetic.fonts.jakartaExtraBold,
    fontSize: 22,
    color: K.navy,
  },
  skipBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...kinetic.typography.bodyMedium,
    color: K.textSecondary,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding,
  },
  heroCard: {
    borderRadius: kinetic.radii.xl,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    ...kinetic.shadows.elevated,
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  heroTitle: {
    ...kinetic.typography.displayMedium,
    color: K.textInverse,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  heroSubtitle: {
    ...kinetic.typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  chip: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    ...kinetic.typography.caption,
    color: K.navy,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaWrap: {
    width: "100%",
    borderRadius: kinetic.radii.md,
    ...kinetic.shadows.ctaCoral,
  },
  ctaGradient: {
    minHeight: 56,
    borderRadius: kinetic.radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  ctaText: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 16,
    color: K.textInverse,
  },
  disabled: {
    opacity: 0.6,
  },
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  loginText: {
    ...kinetic.typography.body,
    color: K.textSecondary,
  },
  loginLink: {
    ...kinetic.typography.bodyMedium,
    color: K.coralDark,
  },
});

export default OnboardingScreen;
