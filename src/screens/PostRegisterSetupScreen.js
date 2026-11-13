import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "../components/BrandLogo";
import { LegalDocModal } from "../components/ui/LegalDocModal";
import { WhatsAppNudgeIcon } from "../components/kinetic/SettlementIcons";
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
import { layout, spacing, typography, kinetic } from "../theme/tokens";

const K = kinetic.colors;

const CURRENCY_META = {
  INR: { flag: "🇮🇳", name: "Indian Rupee", symbol: "₹" },
  USD: { flag: "🇺🇸", name: "US Dollar", symbol: "$" },
  EUR: { flag: "🇪🇺", name: "Euro", symbol: "€" },
  AED: { flag: "🇦🇪", name: "UAE Dirham", symbol: "د.إ" },
  GBP: { flag: "🇬🇧", name: "British Pound", symbol: "£" },
};

const SPLIT_STYLES = [
  { key: "trips", label: "Vacation & Trips", icon: "🏖️" },
  { key: "flatmates", label: "Flatmates & Rent", icon: "🏠" },
  { key: "dining", label: "Dining & Outings", icon: "🍕" },
  { key: "projects", label: "Projects & Freelance", icon: "💼" },
];

/**
 * Kinetic post-register setup — Stitch "Personalize your Ledger" (Step 2
 * of 2), replacing the old 3-step wizard UI but preserving every outcome
 * it produced: Terms acceptance is still recorded, currency is still
 * detected from location, and the notification choice still requests (or
 * skips) push permission before setup is marked complete.
 *
 * Honest limits: currency is auto-detected — the app has no manual
 * currency override (updateCurrency is a no-op), so the currency row is
 * display-only with a re-detect action. The WhatsApp nudge and budget
 * alert toggles are stored as preferences on the user profile; no
 * WhatsApp sender exists yet, so they do not send anything today.
 */
export const PostRegisterSetupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const { currency, detectAndApplyCurrency } = useAppSettings();
  const insets = useSafeAreaInsets();

  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";
  const [displayName, setDisplayName] = useState(
    session?.user?.user_metadata?.full_name || ""
  );
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");
  const [splitStyle, setSplitStyle] = useState(null);
  const [whatsappNudge, setWhatsappNudge] = useState(true);
  const [budgetAlert, setBudgetAlert] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);

  const currencyMeta = CURRENCY_META[currency] || {
    flag: "💱",
    name: currency,
    symbol: currency,
  };

  const initials = useMemo(() => {
    const source = displayName.trim() || userEmail;
    if (!source) return "T";
    const parts = source.split(/[\s@._]+/).filter(Boolean);
    return (parts[0]?.[0] || "T").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
  }, [displayName, userEmail]);

  const upiValid = !upiId.trim() || /^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(upiId.trim());

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
          color={K.navy}
          style={styles.pointIcon}
        />
        <Text style={[styles.pointText, { color: theme.textSecondary }]}>
          {point}
        </Text>
      </View>
    ));

  const completeAndGoToDashboard = async (
    userIdValue,
    { notificationsEnabled = false } = {}
  ) => {
    await setPostRegisterSetupComplete(userIdValue);
    handleForegroundNotifications();
    handleBackgroundNotifications();
    await detectAndApplyCurrency();
    if (!notificationsEnabled) {
      await registerForPushNotificationsAsync({ requestPermission: false });
    }
    navigation.replace("Dashboard");
  };

  const finishSetup = async ({ later = false } = {}) => {
    if (!userId || finishing || !termsAccepted) return;
    if (!later && upiId.trim() && !upiValid) {
      setUpiError("Enter a valid UPI ID, e.g. yourname@okhdfcbank");
      return;
    }

    setFinishing(true);
    try {
      let notificationsEnabled = false;
      if (!later) {
        await requestLocationPermissionFromSetup();
        await detectAndApplyCurrency();
        if (pushEnabled) {
          const token = await requestNotificationPermissionFromSetup();
          notificationsEnabled = Boolean(token);
        }
      }

      const userData = { terms_accepted_at: new Date().toISOString() };
      const profileUpdates = { has_notifications: notificationsEnabled };
      if (!later) {
        if (displayName.trim()) {
          userData.full_name = displayName.trim();
          profileUpdates.full_name = displayName.trim();
        }
        if (splitStyle) userData.split_style = splitStyle;
        userData.whatsapp_nudge = whatsappNudge;
        userData.budget_alert_80 = budgetAlert;
        if (upiId.trim()) profileUpdates.upi_id = upiId.trim();
      }

      await supabase.auth.updateUser({ data: userData });
      await supabase.from("profiles").update(profileUpdates).eq("id", userId);

      await completeAndGoToDashboard(userId, { notificationsEnabled });
    } catch (error) {
      console.error("Post-register setup error:", error?.message || error);
      await completeAndGoToDashboard(userId, { notificationsEnabled: false });
    } finally {
      setFinishing(false);
    }
  };

  const handleRedetectCurrency = async () => {
    setDetecting(true);
    try {
      await requestLocationPermissionFromSetup();
      await detectAndApplyCurrency();
    } finally {
      setDetecting(false);
    }
  };

  const toggleRow = ({
    icon,
    title,
    body,
    value,
    onChange,
    testID,
    label,
    iconNode,
  }) => (
    <View style={[styles.toggleRow, { borderColor: theme.border }]}>
      <View style={[styles.toggleIcon, { backgroundColor: K.tintGreen }]}>
        {iconNode || <MaterialCommunityIcons name={icon} size={22} color={K.success} />}
      </View>
      <View style={styles.toggleTextWrap}>
        <Text style={[styles.toggleTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.toggleBody, { color: theme.textSecondary }]}>{body}</Text>
      </View>
      <Switch
        testID={testID}
        accessibilityRole="switch"
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: K.border, true: K.coral }}
        thumbColor={K.textInverse}
      />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: K.canvas,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandLogo size={40} />
          <Text style={[styles.brand, { color: theme.text }]}>Trivense</Text>
        </View>
        <View style={[styles.stepPill, { backgroundColor: K.navy }]}>
          <Text style={styles.stepPillText}>2 / 2</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressDot, { backgroundColor: K.navy, width: 28 }]} />
        <View style={[styles.progressDot, { backgroundColor: K.coral, width: 28 }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.stepCaption, { color: K.coralDark }]}>
          Step 2 of 2 • Quick Setup
        </Text>
        <Text style={[styles.title, { color: theme.text }]}>Personalize your Ledger</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Set up your default currency, UPI ID, and spending style in 30 seconds.
        </Text>

        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: K.navy }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarTextWrap}>
            <Text style={[styles.avatarName, { color: theme.text }]} numberOfLines={1}>
              {displayName.trim() || userEmail || "Your ledger"}
            </Text>
            <Text style={[styles.avatarEmail, { color: theme.textSecondary }]} numberOfLines={1}>
              {userEmail}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Display Name</Text>
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: theme.inputBackground, borderColor: theme.border },
          ]}
        >
          <MaterialCommunityIcons name="account-outline" size={20} color={theme.textMuted} />
          <TextInput
            testID="post-register-display-name-input"
            accessibilityLabel="Display Name"
            style={[styles.input, { color: theme.text }]}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
          <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.textMuted} />
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Default Settlement Currency</Text>
        <View style={[styles.currencyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.currencyFlag}>{currencyMeta.flag}</Text>
          <View style={styles.currencyTextWrap}>
            <Text style={[styles.currencyName, { color: theme.text }]}>
              {currencyMeta.name} ({currencyMeta.symbol} {currency})
            </Text>
            <Text style={[styles.currencyNote, { color: theme.textSecondary }]}>
              Auto-detected from your location
            </Text>
          </View>
          <TouchableOpacity
            testID="post-register-redetect-currency"
            onPress={handleRedetectCurrency}
            disabled={detecting}
            style={styles.refreshBtn}
            accessibilityRole="button"
            accessibilityLabel="Re-detect currency from location"
          >
            {detecting ? (
              <ActivityIndicator size="small" color={K.navy} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color={K.navy} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Default UPI ID for Payouts</Text>
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: theme.inputBackground,
              borderColor: upiError || !upiValid ? theme.error : theme.border,
            },
          ]}
        >
          <MaterialCommunityIcons name="bank-outline" size={20} color={theme.textMuted} />
          <TextInput
            testID="post-register-upi-input"
            accessibilityLabel="Default UPI ID for Payouts"
            style={[styles.input, { color: theme.text }]}
            placeholder="yourname@okhdfcbank"
            placeholderTextColor={theme.textMuted}
            value={upiId}
            onChangeText={(v) => {
              setUpiId(v);
              if (upiError) setUpiError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {upiValid && upiId.trim() ? (
            <MaterialCommunityIcons name="check-circle" size={20} color={K.success} />
          ) : null}
          <View style={[styles.zeroFeePill, { backgroundColor: K.tintGreen }]}>
            <Text style={[styles.zeroFeeText, { color: K.textPositive }]}>Zero Fee</Text>
          </View>
        </View>
        {upiError || (!upiValid && upiId.trim()) ? (
          <Text style={[styles.error, { color: theme.error }]}>
            {upiError || "Enter a valid UPI ID, e.g. yourname@okhdfcbank"}
          </Text>
        ) : (
          <View style={styles.upiNote}>
            <UpiBoltIcon />
            <Text style={[styles.upiNoteText, { color: theme.textSecondary }]}>
              Enables frictionless 1-tap settlements directly to your bank account
              with complete transparency.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          What will you split most often?
        </Text>
        <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
          We&apos;ll tailor ledger templates and smart group tags for you.
        </Text>
        <View style={styles.chipsGrid}>
          {SPLIT_STYLES.map((style) => {
            const selected = splitStyle === style.key;
            return (
              <TouchableOpacity
                key={style.key}
                testID={`post-register-split-${style.key}`}
                onPress={() => setSplitStyle(selected ? null : style.key)}
                activeOpacity={0.85}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={style.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? K.tintBlue : theme.surface,
                    borderColor: selected ? K.navy : theme.border,
                  },
                ]}
              >
                <Text style={styles.chipIcon}>{style.icon}</Text>
                <Text
                  style={[styles.chipLabel, { color: selected ? K.navy : theme.text }]}
                  numberOfLines={2}
                >
                  {style.label}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color={K.navy}
                    style={styles.chipCheck}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Ledger Automation & Alerts
        </Text>
        {toggleRow({
          title: "Instant WhatsApp settlement nudge",
          body: "Receive automated ping when someone clears their tab.",
          value: whatsappNudge,
          onChange: setWhatsappNudge,
          testID: "post-register-whatsapp-nudge-toggle",
          label: "Instant WhatsApp settlement nudge",
          iconNode: <WhatsAppNudgeIcon size={22} />,
        })}
        {toggleRow({
          icon: "bell-ring-outline",
          title: "Monthly 80% budget alert",
          body: "Smart threshold forecast to avoid group overspending.",
          value: budgetAlert,
          onChange: setBudgetAlert,
          testID: "post-register-budget-alert-toggle",
          label: "Monthly 80 percent budget alert",
        })}
        {toggleRow({
          icon: "bell-outline",
          title: "Push notifications",
          body: "Get reminded when someone settles up or adds an expense.",
          value: pushEnabled,
          onChange: setPushEnabled,
          testID: "post-register-notifications-toggle",
          label: "Push notifications",
        })}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardHeading, { color: theme.text }]}>
            {t("termsOfService")}
          </Text>
          {renderLegalPoints(TERMS_MAIN_POINTS)}
          <TouchableOpacity
            testID="post-register-open-terms"
            style={styles.readMoreBtn}
            onPress={() => setLegalDoc("terms")}
          >
            <Text style={[styles.link, { color: K.coralDark }]}>{t("readFullTerms")}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={K.coralDark} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardHeading, { color: theme.text }]}>
            {t("privacyPolicy")}
          </Text>
          {renderLegalPoints(PRIVACY_MAIN_POINTS)}
          <TouchableOpacity
            testID="post-register-open-privacy"
            style={styles.readMoreBtn}
            onPress={() => setLegalDoc("privacy")}
          >
            <Text style={[styles.link, { color: K.coralDark }]}>{t("readFullPrivacy")}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={K.coralDark} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="post-register-terms-checkbox"
          style={[styles.card, styles.checkboxCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setTermsAccepted((value) => !value)}
          activeOpacity={0.85}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          accessibilityLabel={t("postRegisterTermsCheckbox")}
        >
          <MaterialCommunityIcons
            name={termsAccepted ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={termsAccepted ? K.coral : theme.textMuted}
          />
          <Text style={[styles.checkboxText, { color: theme.text }]}>
            {t("postRegisterTermsCheckbox")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          testID="post-register-complete-setup"
          onPress={() => finishSetup({ later: false })}
          disabled={!termsAccepted || finishing}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Complete Setup and Go to Dashboard"
          accessibilityState={{ disabled: !termsAccepted || finishing, busy: finishing }}
          style={[styles.ctaWrap, (!termsAccepted || finishing) && styles.disabled]}
        >
          <LinearGradient
            colors={K.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {finishing ? (
              <ActivityIndicator color={K.textInverse} style={styles.spinner} />
            ) : null}
            <Text style={styles.ctaText}>Complete Setup & Go to Dashboard</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={K.textInverse} />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          testID="post-register-setup-later"
          onPress={() => finishSetup({ later: true })}
          disabled={!termsAccepted || finishing}
          style={styles.laterBtn}
          accessibilityRole="button"
          accessibilityLabel="I'll do this later"
          accessibilityState={{ disabled: !termsAccepted || finishing }}
        >
          <MaterialCommunityIcons name="auto-fix" size={18} color={K.coralDark} />
          <Text style={[styles.laterText, { color: K.coralDark }]}>
            I&apos;ll do this later
          </Text>
        </TouchableOpacity>
        {!termsAccepted ? (
          <Text style={[styles.gateHint, { color: theme.textSecondary }]}>
            Accept the Terms & Privacy Policy above to continue.
          </Text>
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

function UpiBoltIcon() {
  return <MaterialCommunityIcons name="bolt" size={16} color={K.coral} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brand: {
    ...typography.h3,
    fontSize: 22,
  },
  stepPill: {
    borderRadius: kinetic.radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepPillText: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 12,
    color: K.textInverse,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  progressDot: {
    height: 8,
    borderRadius: kinetic.radii.full,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  stepCaption: {
    ...kinetic.typography.captionBold,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  title: {
    ...kinetic.typography.displayMedium,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...kinetic.typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: kinetic.fonts.jakartaExtraBold,
    fontSize: 22,
    color: K.textInverse,
  },
  avatarTextWrap: { flex: 1 },
  avatarName: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 16,
  },
  avatarEmail: {
    ...kinetic.typography.caption,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    marginBottom: spacing.lg,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.md },
  error: { fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md },
  currencyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: kinetic.radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  currencyFlag: { fontSize: 28 },
  currencyTextWrap: { flex: 1, gap: 2 },
  currencyName: {
    fontFamily: kinetic.fonts.jakartaSemiBold,
    fontSize: 15,
  },
  currencyNote: {
    ...kinetic.typography.caption,
  },
  refreshBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  zeroFeePill: {
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  zeroFeeText: {
    fontFamily: kinetic.fonts.interBold,
    fontSize: 10,
  },
  upiNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  upiNoteText: {
    ...kinetic.typography.caption,
    flex: 1,
    lineHeight: 16,
  },
  sectionTitle: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...kinetic.typography.caption,
    marginBottom: spacing.md,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  chip: {
    width: "48%",
    borderWidth: 1.5,
    borderRadius: kinetic.radii.md,
    padding: spacing.md,
    minHeight: 76,
    justifyContent: "center",
    gap: 4,
  },
  chipIcon: { fontSize: 22 },
  chipLabel: {
    fontFamily: kinetic.fonts.jakartaSemiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  chipCheck: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: kinetic.radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextWrap: { flex: 1, gap: 2 },
  toggleTitle: {
    fontFamily: kinetic.fonts.jakartaSemiBold,
    fontSize: 14,
  },
  toggleBody: {
    ...kinetic.typography.caption,
    lineHeight: 16,
  },
  card: {
    width: "100%",
    borderRadius: kinetic.radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
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
    minHeight: 44,
  },
  checkboxCard: {
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
    marginTop: spacing.md,
  },
  ctaWrap: {
    borderRadius: kinetic.radii.md,
    ...kinetic.shadows.ctaCoral,
  },
  ctaGradient: {
    minHeight: 56,
    borderRadius: kinetic.radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 15,
    color: K.textInverse,
  },
  spinner: { marginRight: 8 },
  disabled: { opacity: 0.6 },
  laterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 48,
  },
  laterText: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 14,
  },
  gateHint: {
    ...kinetic.typography.caption,
    textAlign: "center",
  },
});

export default PostRegisterSetupScreen;
