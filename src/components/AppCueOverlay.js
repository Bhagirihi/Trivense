import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAppCue } from "../context/AppCueContext";
import { useTranslation } from "../hooks/useTranslation";
import { getTourSteps } from "../config/appCues";
import { layout, radii, spacing, typography } from "../theme/tokens";

export default function AppCueOverlay() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    isActive,
    activeTour,
    activeStep,
    stepIndex,
    tourContext,
    nextStep,
    skipTour,
  } = useAppCue();

  if (!isActive || !activeStep) return null;

  const steps = getTourSteps(activeTour);
  const isLast = stepIndex >= steps.length - 1;
  const bodyKey =
    !tourContext.hasBoards && activeStep.bodyKeyNoBoards
      ? activeStep.bodyKeyNoBoards
      : activeStep.bodyKey;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={skipTour} />

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primaryMuted }]}>
              <MaterialCommunityIcons
                name={activeStep.icon}
                size={24}
                color={theme.primary}
              />
            </View>
            <TouchableOpacity onPress={skipTour} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {t(activeStep.titleKey)}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t(bodyKey)}
          </Text>

          <View style={styles.dots}>
            {steps.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === stepIndex ? theme.primary : theme.border,
                    width: index === stepIndex ? 18 : 7,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={skipTour} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>
                {t("cueSkipTour")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: theme.primary }]}
              onPress={nextStep}
              activeOpacity={0.85}
            >
              <Text style={[styles.nextText, { color: theme.white }]}>
                {isLast ? t("cueGotIt") : t("cueNext")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  skipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  nextBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  nextText: {
    ...typography.bodyMedium,
    fontWeight: "700",
  },
});
