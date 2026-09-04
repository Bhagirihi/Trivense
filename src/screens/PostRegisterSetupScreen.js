import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandLogo from "../components/BrandLogo";
import FormButton from "../components/common/FormButton";
import LegalDocModal from "../components/ui/LegalDocModal";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../hooks/useTranslation";
import {
  TERMS_MAIN_POINTS,
  PRIVACY_MAIN_POINTS,
  LEGAL_URLS,
} from "../config/legalContent";
import { supabase } from "../config/supabase";
import { requestLocationPermissionFromSetup } from "../services/locationPermissionService";
import { useAppSettings } from "../context/AppSettingsContext";
import {
  handleBackgroundNotifications,
  handleForegroundNotifications,
  registerForPushNotificationsAsync,
  requestNotificationPermissionFromSetup,
} from "../services/pushNotificationService";
import { setPostRegisterSetupComplete } from "../utils/postRegisterSetupStorage";
import { layout, radii, spacing, typography } from "../theme/tokens";

const STEPS = ["terms", "location", "notifications"];

export const PostRegisterSetupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { detectAndApplyCurrency } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);

  const step = STEPS[stepIndex];

  const stepTitle = useMemo(() => {
    if (step === "terms") return t("postRegisterTermsTitle");
    if (step === "location") return t("postRegisterLocationTitle");
    return t("postRegisterNotificationsTitle");
  }, [step, t]);

  const stepBody = useMemo(() => {
    if (step === "terms") return t("postRegisterTermsBody");
    if (step === "location") return t("postRegisterLocationBody");
    return t("postRegisterNotificationsBody");
  }, [step, t]);

  const stepIcon = useMemo(() => {
    if (step === "terms") return "file-document-outline";
    if (step === "location") return "map-marker-radius-outline";
    return "bell-ring-outline";
  }, [step]);

  const legalDocConfig = useMemo(
    () => ({
      terms: {
        title: t("termsOfService"),
        points: TERMS_MAIN_POINTS,
        fullUrl: LEGAL_URLS.terms,
      },
      privacy: {
        title: t("privacyPolicy"),
        points: PRIVACY_MAIN_POINTS,
        fullUrl: LEGAL_URLS.privacy,
      },
    }),
    [t]
  );
  const activeLegalDoc = legalDoc ? legalDocConfig[legalDoc] : null;

  const renderLegalPoints = (points) =>
    points.map((point, index) => (
      <View key={index} style={styles.pointRow}>
        <MaterialCommunityIcons
          name="circle-small"
          size={22}
          color={theme.primary}
          style={styles.pointIcon}
        />
        <Text style={[styles.pointText, { color: theme.textSecondary }]}>
          {point}
        </Text>
      </View>
    ));

  const completeAndGoToDashboard = async (
    userId,
    { notificationsEnabled = false } = {}
  ) => {
    await setPostRegisterSetupComplete(userId);
    handleForegroundNotifications();
    handleBackgroundNotifications();
    await detectAndApplyCurrency();
    if (!notificationsEnabled) {
      await registerForPushNotificationsAsync({ requestPermission: false });
    }
    navigation.replace("Dashboard");
  };

  const finishSetup = async ({ notificationsEnabled = false } = {}) => {
    const userId = session?.user?.id;
    if (!userId || finishing) return;

    setFinishing(true);
    try {
      await supabase.auth.updateUser({
        data: {
          terms_accepted_at: new Date().toISOString(),
        },
      });

      await supabase
        .from("profiles")
        .update({ has_notifications: notificationsEnabled })
        .eq("id", userId);

      await completeAndGoToDashboard(userId, { notificationsEnabled });
    } catch (error) {
      console.error("Post-register setup error:", error?.message || error);
      await completeAndGoToDashboard(userId, { notificationsEnabled });
    } finally {
      setFinishing(false);
    }
  };

  const onContinueTerms = () => {
    if (!termsAccepted) return;
    setStepIndex(1);
  };

  const onLocationChoice = async (requestPermission) => {
    if (requestPermission) {
      await requestLocationPermissionFromSetup();
      await detectAndApplyCurrency();
    }
    setStepIndex(2);
  };

  const onNotificationChoice = async (requestPermission) => {
    let enabled = false;
    if (requestPermission) {
      const token = await requestNotificationPermissionFromSetup();
      enabled = Boolean(token);
    }
    await finishSetup({ notificationsEnabled: enabled });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <BrandLogo size={40} />
        <Text style={[styles.brand, { color: theme.text }]}>Trivense</Text>
      </View>

      <View style={styles.progressRow}>
        {STEPS.map((key, index) => (
          <View
            key={key}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index <= stepIndex ? theme.primary : theme.borderLight,
                width: index === stepIndex ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCenter}>
          <View
            style={[styles.iconCircle, { backgroundColor: theme.primaryMuted }]}
          >
            <MaterialCommunityIcons
              name={stepIcon}
              size={44}
              color={theme.primary}
            />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{stepTitle}</Text>
          {step !== "terms" ? (
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {stepBody}
            </Text>
          ) : null}
        </View>

        {step === "terms" ? (
          <View style={styles.termsWrap}>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.cardHeading, { color: theme.text }]}>
                {t("termsOfService")}
              </Text>
              {renderLegalPoints(TERMS_MAIN_POINTS)}
              <TouchableOpacity
                testID="post-register-open-terms"
                style={styles.readMoreBtn}
                onPress={() => setLegalDoc("terms")}
              >
                <Text style={[styles.link, { color: theme.primary }]}>
                  {t("readFullTerms")}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.cardHeading, { color: theme.text }]}>
                {t("privacyPolicy")}
              </Text>
              {renderLegalPoints(PRIVACY_MAIN_POINTS)}
              <TouchableOpacity
                testID="post-register-open-privacy"
                style={styles.readMoreBtn}
                onPress={() => setLegalDoc("privacy")}
              >
                <Text style={[styles.link, { color: theme.primary }]}>
                  {t("readFullPrivacy")}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                testID="post-register-terms-checkbox"
                style={styles.checkboxRow}
                onPress={() => setTermsAccepted((value) => !value)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name={
                    termsAccepted ? "checkbox-marked" : "checkbox-blank-outline"
                  }
                  size={24}
                  color={termsAccepted ? theme.primary : theme.textMuted}
                />
                <Text style={[styles.checkboxText, { color: theme.text }]}>
                  {t("postRegisterTermsCheckbox")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        {step === "terms" ? (
          <FormButton
            testID="post-register-terms-continue"
            title={t("next")}
            onPress={onContinueTerms}
            disabled={!termsAccepted}
            loading={finishing}
          />
        ) : null}

        {step === "location" ? (
          <>
            <FormButton
              testID="post-register-location-allow"
              title={t("postRegisterAllowLocation")}
              onPress={() => onLocationChoice(true)}
              loading={finishing}
            />
            <FormButton
              testID="post-register-location-skip"
              title={t("postRegisterNotNow")}
              variant="outline"
              onPress={() => onLocationChoice(false)}
              disabled={finishing}
              style={styles.secondaryBtn}
            />
          </>
        ) : null}

        {step === "notifications" ? (
          <>
            <FormButton
              testID="post-register-notifications-enable"
              title={t("postRegisterEnableNotifications")}
              onPress={() => onNotificationChoice(true)}
              loading={finishing}
            />
            <FormButton
              testID="post-register-notifications-skip"
              title={t("postRegisterNotNow")}
              variant="outline"
              onPress={() => onNotificationChoice(false)}
              disabled={finishing}
              style={styles.secondaryBtn}
            />
          </>
        ) : null}
      </View>

      <LegalDocModal
        visible={Boolean(activeLegalDoc)}
        title={activeLegalDoc?.title}
        points={activeLegalDoc?.points ?? []}
        fullUrl={activeLegalDoc?.fullUrl}
        onClose={() => setLegalDoc(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  brand: {
    ...typography.h3,
    fontSize: 22,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  progressDot: {
    height: 8,
    borderRadius: radii.full,
  },
  heroCenter: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  content: {
    flexGrow: 1,
    alignItems: "stretch",
    paddingBottom: spacing.xl,
  },
  termsWrap: {
    width: "100%",
    gap: spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.lg,
    maxWidth: 340,
    alignSelf: "center",
  },
  card: {
    width: "100%",
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardHeading: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pointIcon: {
    marginLeft: -4,
    marginTop: 1,
  },
  pointText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 20,
    fontSize: 14,
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  checkboxText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
  },
  link: {
    ...typography.label,
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  secondaryBtn: {
    marginTop: 0,
  },
});

export default PostRegisterSetupScreen;
