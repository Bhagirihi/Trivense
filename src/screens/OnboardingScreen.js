import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BrandLogo from "../components/BrandLogo";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { setOnboardingComplete } from "../utils/onboardingStorage";
import { layout, radii, spacing, typography } from "../theme/tokens";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    key: "track",
    icon: "airplane",
    titleKey: "trackTravelExpenses",
    subtitleKey: "keepCostsInOnePlace",
  },
  {
    key: "split",
    icon: "account-group",
    titleKey: "splitBillsEasily",
    subtitleKey: "shareWithCompanions",
  },
  {
    key: "budget",
    icon: "chart-line",
    titleKey: "planYourBudget",
    subtitleKey: "setBudgetsAndTrack",
  },
];

export const OnboardingScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await setOnboardingComplete();
    const routeNames = navigation.getState()?.routeNames || [];
    if (routeNames.includes("Login")) {
      navigation.replace("Login");
      return;
    }
    navigation.replace("Dashboard");
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
      <View style={[styles.iconCircle, { backgroundColor: theme.primaryMuted }]}>
        <MaterialCommunityIcons name={item.icon} size={48} color={theme.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{t(item.titleKey)}</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {t(item.subtitleKey)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.logoRow}>
        <BrandLogo size={44} />
        <Text style={[styles.brand, { color: theme.text }]}>Trivense</Text>
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
                  backgroundColor: i === index ? theme.primary : theme.border,
                  width: i === index ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={onNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            index === SLIDES.length - 1 ? t("getStarted") : t("next")
          }
        >
          <Text style={[styles.buttonText, { color: theme.white }]}>
            {index === SLIDES.length - 1 ? t("getStarted") : t("next")}
          </Text>
        </TouchableOpacity>

        {index < SLIDES.length - 1 ? (
          <TouchableOpacity
            onPress={finish}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel={t("skip")}
          >
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>
              {t("skip")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xxl,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  brand: {
    ...typography.h3,
    fontWeight: "700",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: layout.screenPadding + spacing.md,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
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
  button: {
    width: "100%",
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  buttonText: {
    ...typography.bodyMedium,
    fontWeight: "700",
  },
  skipBtn: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.caption,
  },
});

export default OnboardingScreen;
