import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { signUpWithEmail, signInWithGoogle } from "../config/supabase";
import { isValidEmail } from "../utils/validation";
import { showNetworkAwareError } from "../utils/toast";
import AuthShell from "../components/ui/AuthShell";
import FormButton from "../components/common/FormButton";
import { createAuthFormStyles } from "../components/ui/authFormStyles";
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
import { spacing } from "../theme/tokens";

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
          <MaterialCommunityIcons
            name={options.icon}
            size={18}
            color={theme.textMuted}
            style={styles.inputIcon}
          />
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
              style={styles.eyeBtn}
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
        </View>
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
            <Text style={[styles.footerLink, { color: theme.primary }]}>
              {t("signIn")}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      {step === 1 ? (
        <>
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
                  {t("continueWithGoogle")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>
              {t("orSignUpWithEmail")}
            </Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>

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
          {renderField(t("mobileOptional"), "mobile", {
            icon: "phone-outline",
            placeholder: t("mobilePlaceholder"),
            keyboard: "phone-pad",
            maxLength: 16,
          })}

          <FormButton
            testID="register-continue-button"
            accessibilityLabel="Continue"
            title="Continue"
            onPress={handleContinue}
            size="medium"
            style={styles.submitBtn}
          />

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
            }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color={theme.primary}
            />
            <Text style={[styles.footerLink, { color: theme.primary }]}>
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

          <FormButton
            testID="register-submit-button"
            accessibilityLabel={t("createAccount")}
            title={t("createAccount")}
            onPress={handleRegister}
            loading={loading}
            size="medium"
            style={styles.submitBtn}
          />

          {legalLinks}
        </>
      )}
    </AuthShell>
  );
};

export default RegisterScreen;
