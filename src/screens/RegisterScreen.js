import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { signUpWithEmail, signInWithGoogle } from "../config/supabase";
import { isValidEmail } from "../utils/validation";
import { showNetworkAwareError } from "../utils/toast";
import { AuthShell } from "../components/ui/AuthShell";
import { createAuthFormStyles } from "../components/ui/authFormStyles";
import { WhatsAppNudgeIcon } from "../components/kinetic/SettlementIcons";
import { useTranslation } from "../hooks/useTranslation";
import {
  getPendingReferralCode,
  normalizeReferralCode,
  setPendingReferralCode,
} from "../utils/referralStorage";
import {
  markPostRegisterSetupPending,
  clearPostRegisterSetupPending,
} from "../utils/postRegisterSetupStorage";
import { navigateAfterRegisterAuth } from "../utils/postRegisterNavigation";
import { LEGAL_URLS } from "../config/legalContent";
import { kinetic, spacing } from "../theme/tokens";

const K = kinetic.colors;

/**
 * Kinetic register. Flow unchanged: 2 steps (details, then password),
 * same testIDs / placeholders / i18n labels, same Supabase sign-up and
 * Google sign-up. New: +91 mobile prefix with UPI-alerts note, live
 * password-strength meter, Terms + WhatsApp consent checkbox gating the
 * create-account submit, and the three Stitch mini-cards.
 */
function KineticCta({ title, onPress, loading, disabled, testID, accessibilityLabel }) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
      style={[localStyles.ctaWrap, (disabled || loading) && localStyles.disabled]}
    >
      <LinearGradient
        colors={K.coralGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={localStyles.ctaGradient}
      >
        {loading ? (
          <ActivityIndicator color={K.textInverse} style={localStyles.spinner} />
        ) : null}
        <Text style={localStyles.ctaText}>{title}</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color={K.textInverse} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const STRENGTH_LABELS = ["", "Weak password", "Fair password", "Good password", "Strong password"];

const MINI_CARDS = [
  { icon: "bolt", title: "1-Tap UPI", body: "No account number needed" },
  { icon: "whatsapp", title: "WhatsApp Bot", body: "Split bills inside chat" },
  { icon: "shield", title: "RBI Safe", body: "Zero ledger exposure" },
];

const RegisterScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const route = useRoute();
  const compact = true;
  const styles = useMemo(() => createAuthFormStyles(compact), [compact]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      const fromRoute = normalizeReferralCode(route.params?.referralCode);
      const fromStorage = await getPendingReferralCode();
      const code = fromRoute || fromStorage;
      if (code) {
        setFormData((prev) => ({ ...prev, referralCode: code }));
        await setPendingReferralCode(code);
      }
    })();
  }, [route.params?.referralCode]);

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (formData.mobile.trim()) {
      const digits = formData.mobile.replace(/[\s()-]/g, "");
      if (!/^\+?\d{8,15}$/.test(digits)) {
        newErrors.mobile = "Enter a valid phone number (8–15 digits)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleBack = () => {
    setErrors({});
    setStep(1);
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    try {
      if (formData.referralCode.trim()) {
        await setPendingReferralCode(formData.referralCode);
      }

      await markPostRegisterSetupPending();

      const { data, error: signUpError } = await signUpWithEmail(
        formData.email.trim(),
        formData.password,
        {
          full_name: formData.fullName.trim(),
          mobile: formData.mobile.trim() || null,
          phone_number: formData.mobile.trim() || null,
          avatar_url: null,
          has_notifications: false,
        }
      );

      if (signUpError) {
        await clearPostRegisterSetupPending();
        throw signUpError;
      }

      if (data?.user?.email_confirmed_at) {
        await navigateAfterRegisterAuth(navigation, { userId: data.user.id });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "EmailVerification",
            params: { email: formData.email.trim() },
          },
        ],
      });
    } catch (error) {
      console.error("Registration error:", error.message);
      await showNetworkAwareError(error.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const completeSocialSignUp = async (session, label) => {
    const user = session?.user;
    if (!user?.id) {
      await clearPostRegisterSetupPending();
      throw new Error(`${label} failed. Please try again.`);
    }
    try {
      await navigateAfterRegisterAuth(navigation, { userId: user.id });
    } catch {
      // Auth stack remount handles routing.
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      if (formData.referralCode.trim()) {
        await setPendingReferralCode(formData.referralCode);
      }
      await markPostRegisterSetupPending();
      const { data: session, error } = await signInWithGoogle();
      if (error) {
        await clearPostRegisterSetupPending();
        throw error;
      }
      await completeSocialSignUp(session, "Google sign-up");
    } catch (error) {
      if (error?.message?.toLowerCase().includes("cancelled")) return;
      await showNetworkAwareError(error?.message || "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const strength = passwordStrength(formData.password);
  const strengthColor =
    strength <= 1 ? K.danger : strength === 2 ? K.warning : K.success;

  const renderField = (label, key, options = {}) => {
    const isSecure = options.secure;
    const visible =
      options.secureKey === "confirm" ? showConfirmPassword : showPassword;
    const toggleVisible =
      options.secureKey === "confirm"
        ? () => setShowConfirmPassword((v) => !v)
        : () => setShowPassword((v) => !v);

    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: theme.inputBackground,
              borderColor: errors[key] ? theme.error : theme.border,
            },
          ]}
        >
          {key === "mobile" ? (
            <Text style={[localStyles.countryCode, { color: theme.text }]}>+91</Text>
          ) : (
            <MaterialCommunityIcons
              name={options.icon}
              size={18}
              color={theme.textMuted}
              style={styles.inputIcon}
            />
          )}
          <TextInput
            testID={`register-${key}-input`}
            accessibilityLabel={label}
            style={[styles.input, { color: theme.text }]}
            placeholder={options.placeholder}
            placeholderTextColor={theme.textMuted}
            value={formData[key]}
            onChangeText={(text) => {
              setFormData((prev) => ({ ...prev, [key]: text }));
              if (errors[key]) {
                setErrors((prev) => ({ ...prev, [key]: undefined }));
              }
            }}
            secureTextEntry={isSecure && !visible}
            keyboardType={options.keyboard || "default"}
            autoCapitalize={options.autoCapitalize || "none"}
            maxLength={options.maxLength}
          />
          {isSecure ? (
            <TouchableOpacity
              onPress={toggleVisible}
              style={[styles.eyeBtn, localStyles.eyeHit]}
              accessibilityRole="button"
              accessibilityLabel={visible ? "Hide password" : "Show password"}
            >
              <MaterialCommunityIcons
                name={visible ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          ) : null}
          {key === "mobile" && formData.mobile.trim() && !errors.mobile ? (
            <MaterialCommunityIcons name="check-circle" size={18} color={K.success} />
          ) : null}
        </View>
        {options.note ? (
          <View style={localStyles.noteRow}>
            <MaterialCommunityIcons name="bolt" size={14} color={K.coral} />
            <Text style={[localStyles.noteText, { color: theme.textSecondary }]}>
              {options.note}
            </Text>
          </View>
        ) : null}
        {errors[key] ? (
          <Text style={[styles.error, { color: theme.error }]}>{errors[key]}</Text>
        ) : null}
      </View>
    );
  };

  const legalLinks = (
    <View style={styles.legalRow}>
      <TouchableOpacity
        onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
        accessibilityRole="link"
        accessibilityLabel={t("privacyPolicy")}
      >
        <Text style={[styles.forgotText, { color: theme.textSecondary }]}>
          {t("privacyPolicy")}
        </Text>
      </TouchableOpacity>
      <Text style={{ color: theme.textMuted }}>·</Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(LEGAL_URLS.terms)}
        accessibilityRole="link"
        accessibilityLabel={t("termsOfService")}
      >
        <Text style={[styles.forgotText, { color: theme.textSecondary }]}>
          {t("termsOfService")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <AuthShell
      testID="screen-register"
      compact
      title={t("createAccountTitle")}
      subtitle={
        step === 1
          ? "Step 1 of 2 — your details"
          : "Step 2 of 2 — secure your account"
      }
      footer={
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {t("alreadyHaveAccount")}{" "}
          </Text>
          <TouchableOpacity
            testID="register-go-login"
            accessibilityRole="link"
            accessibilityLabel={t("signIn")}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[styles.footerLink, { color: K.coralDark }]}>
              {t("signIn")}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      {step === 1 ? (
        <>
          {renderField(t("fullName"), "fullName", {
            icon: "account-outline",
            placeholder: t("yourFullName"),
            autoCapitalize: "words",
          })}
          {renderField(t("email"), "email", {
            icon: "email-outline",
            placeholder: "you@example.com",
            keyboard: "email-address",
          })}
          {renderField("Mobile Number", "mobile", {
            icon: "phone-outline",
            placeholder: "98765 43210",
            keyboard: "phone-pad",
            maxLength: 16,
            note: "Used for instant UPI settle alerts and WhatsApp nudges",
          })}

          <KineticCta
            testID="register-continue-button"
            accessibilityLabel="Continue"
            title="Continue"
            onPress={handleContinue}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>
              OR SIGN UP WITH
            </Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleBtn,
              {
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
            onPress={handleGoogleSignUp}
            disabled={googleLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t("continueWithGoogle")}
          >
            {googleLoading ? (
              <Text style={{ color: theme.text }}>...</Text>
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={18} color="#4285F4" />
                <Text style={[styles.googleText, { color: theme.text }]}>
                  Sign up with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={localStyles.miniCards}>
            {MINI_CARDS.map((card) => (
              <View
                key={card.title}
                style={[
                  localStyles.miniCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                {card.icon === "whatsapp" ? (
                  <WhatsAppNudgeIcon size={22} />
                ) : (
                  <MaterialCommunityIcons
                    name={card.icon === "bolt" ? "bolt" : "shield-check-outline"}
                    size={22}
                    color={card.icon === "bolt" ? K.coral : K.success}
                  />
                )}
                <Text style={[localStyles.miniTitle, { color: theme.text }]}>
                  {card.title}
                </Text>
                <Text style={[localStyles.miniBody, { color: theme.textSecondary }]}>
                  {card.body}
                </Text>
              </View>
            ))}
          </View>

          {legalLinks}
        </>
      ) : (
        <>
          <TouchableOpacity
            testID="register-back-step"
            onPress={handleBack}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              marginBottom: spacing.md,
              alignSelf: "flex-start",
              minHeight: 44,
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color={K.coralDark}
            />
            <Text style={[styles.footerLink, { color: K.coralDark }]}>
              Back
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.forgotText,
              { color: theme.textSecondary, marginBottom: spacing.md },
            ]}
            numberOfLines={1}
          >
            {formData.email.trim()}
          </Text>

          {renderField(t("password"), "password", {
            icon: "lock-outline",
            placeholder: t("minEightCharacters"),
            secure: true,
            secureKey: "password",
          })}

          {formData.password ? (
            <View style={localStyles.strengthWrap}>
              <View style={localStyles.strengthTop}>
                <Text style={[localStyles.strengthLabel, { color: theme.textSecondary }]}>
                  Security Level
                </Text>
                <View style={[localStyles.strengthPill, { backgroundColor: K.tintGreen }]}>
                  <MaterialCommunityIcons name="shield-check" size={14} color={strengthColor} />
                  <Text style={[localStyles.strengthPillText, { color: strengthColor }]}>
                    {STRENGTH_LABELS[strength]}
                  </Text>
                </View>
              </View>
              <View style={localStyles.strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <View
                    key={level}
                    style={[
                      localStyles.strengthBar,
                      {
                        backgroundColor:
                          level <= strength ? strengthColor : theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {renderField(t("confirmPassword"), "confirmPassword", {
            icon: "lock-check-outline",
            placeholder: t("reEnterPassword"),
            secure: true,
            secureKey: "confirm",
          })}

          {renderField(t("referralCodeOptional"), "referralCode", {
            icon: "ticket-percent-outline",
            placeholder: t("referralCodePlaceholder"),
            autoCapitalize: "characters",
            maxLength: 12,
          })}

          {formData.referralCode.trim() ? (
            <Text style={[styles.referralHint, { color: theme.textSecondary }]}>
              {t("referralRewardHint")}
            </Text>
          ) : null}

          <TouchableOpacity
            testID="register-consent-checkbox"
            style={localStyles.consentRow}
            onPress={() => setConsentAccepted((v) => !v)}
            activeOpacity={0.85}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consentAccepted }}
            accessibilityLabel="Agree to Terms of Service and Privacy Policy, and consent to WhatsApp settlement notifications"
          >
            <MaterialCommunityIcons
              name={consentAccepted ? "checkbox-marked" : "checkbox-blank-outline"}
              size={24}
              color={consentAccepted ? K.coral : theme.textMuted}
            />
            <Text style={[localStyles.consentText, { color: theme.text }]}>
              I agree to the{" "}
              <Text
                style={{ color: K.coralDark }}
                onPress={() => Linking.openURL(LEGAL_URLS.terms)}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={{ color: K.coralDark }}
                onPress={() => Linking.openURL(LEGAL_URLS.privacy)}
              >
                Privacy Policy
              </Text>
              , and consent to receiving WhatsApp settlement notifications.
            </Text>
          </TouchableOpacity>

          <KineticCta
            testID="register-submit-button"
            accessibilityLabel={t("createAccount")}
            title={t("createAccount")}
            onPress={handleRegister}
            loading={loading}
            disabled={!consentAccepted}
          />

          {legalLinks}
        </>
      )}
    </AuthShell>
  );
};

const localStyles = StyleSheet.create({
  ctaWrap: {
    borderRadius: kinetic.radii.md,
    marginTop: 4,
    ...kinetic.shadows.ctaCoral,
  },
  ctaGradient: {
    minHeight: 52,
    borderRadius: kinetic.radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  ctaText: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 16,
    color: K.textInverse,
  },
  spinner: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  eyeHit: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  countryCode: {
    ...kinetic.typography.bodyMedium,
    marginRight: 8,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: K.border,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 6,
  },
  noteText: {
    ...kinetic.typography.caption,
    flex: 1,
    lineHeight: 16,
  },
  miniCards: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  miniCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: kinetic.radii.md,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  miniTitle: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 12,
    textAlign: "center",
  },
  miniBody: {
    ...kinetic.typography.caption,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  strengthWrap: {
    marginTop: -4,
    marginBottom: 12,
  },
  strengthTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  strengthLabel: {
    ...kinetic.typography.caption,
    fontFamily: kinetic.fonts.interBold,
  },
  strengthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  strengthPillText: {
    fontFamily: kinetic.fonts.interBold,
    fontSize: 11,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
    marginTop: 4,
  },
  consentText: {
    ...kinetic.typography.body,
    flex: 1,
    lineHeight: 20,
  },
});

export default RegisterScreen;
