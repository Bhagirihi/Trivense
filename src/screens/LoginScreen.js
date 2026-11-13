import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { supabase, signInWithGoogle } from "../config/supabase";
import { showNetworkAwareError } from "../utils/toast";
import { isValidEmail } from "../utils/validation";
import { AuthShell } from "../components/ui/AuthShell";
import { createAuthFormStyles } from "../components/ui/authFormStyles";
import { useTranslation } from "../hooks/useTranslation";
import { LEGAL_URLS } from "../config/legalContent";
import { kinetic } from "../theme/tokens";

const K = kinetic.colors;
const REMEMBER_EMAIL_KEY = "login_remembered_email";

/**
 * Kinetic login. Flow unchanged: Supabase email/password sign-in (unverified
 * email routes to EmailVerification), Google sign-in, same testIDs, same
 * i18n labels. "Remember this device" genuinely persists only the email
 * address locally so it can be prefilled next time; no token is stored.
 * Phone OTP login does not exist in the app, so no such button is rendered.
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

export const LoginScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const styles = useMemo(() => createAuthFormStyles(compact), [compact]);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
        if (savedEmail) {
          setFormData((prev) => ({ ...prev, email: savedEmail }));
          setRememberDevice(true);
        }
      } catch {
        // Remembered email is a convenience only; never block sign-in.
      }
    })();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(formData.email)) newErrors.email = "Please enter a valid email";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const persistRememberedEmail = async () => {
    try {
      if (rememberDevice) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, formData.email.trim());
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // Best effort only.
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });
      if (error) {
        if (
          error.message === "Email not confirmed" ||
          error.message?.toLowerCase().includes("email not confirmed")
        ) {
          await persistRememberedEmail();
          navigation.reset({
            index: 0,
            routes: [{ name: "EmailVerification", params: { email: formData.email.trim() } }],
          });
          return;
        }
        await showNetworkAwareError(error.message || "Failed to login");
        return;
      }
      await persistRememberedEmail();
      if (data?.user?.email_confirmed_at) navigation.replace("Dashboard");
    } catch (error) {
      await showNetworkAwareError(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { data: session, error } = await signInWithGoogle();
      if (error) throw error;

      if (!session?.user) {
        await showNetworkAwareError("Google sign-in failed. Please try again.");
        return;
      }
    } catch (error) {
      if (!error?.message?.toLowerCase().includes("cancelled")) {
        await showNetworkAwareError(error?.message || "Google sign-in failed");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderField = (label, key, options = {}) => (
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
          testID={`login-${key}-input`}
          accessibilityLabel={label}
          style={[styles.input, { color: theme.text }]}
          placeholder={options.placeholder}
          placeholderTextColor={theme.textMuted}
          value={formData[key]}
          onChangeText={(text) => {
            setFormData((p) => ({ ...p, [key]: text }));
            if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
          }}
          secureTextEntry={options.secure && !showPassword}
          keyboardType={options.keyboard || "default"}
          autoCapitalize={options.autoCapitalize || "none"}
        />
        {options.secure ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={[styles.eyeBtn, localStyles.eyeHit]}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <MaterialCommunityIcons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
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

  return (
    <AuthShell
      testID="screen-login"
      title={t("welcomeBack")}
      subtitle="Log in to sync your active boards, track shared balance pools, and settle dues in seconds."
      footer={
        <View>
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              {t("dontHaveAccount")}{" "}
            </Text>
            <TouchableOpacity
              testID="login-go-register"
              accessibilityRole="link"
              accessibilityLabel={t("createAccount")}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={[styles.footerLink, { color: K.coralDark }]}>{t("createAccount")}</Text>
            </TouchableOpacity>
          </View>
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
            <Text style={{ color: theme.textMuted }}>·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:support@trivense.app")}
              accessibilityRole="link"
              accessibilityLabel="Contact Support"
            >
              <Text style={[styles.forgotText, { color: theme.textSecondary }]}>
                Contact Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      {renderField("Email or Mobile Number", "email", {
        icon: "email-outline",
        placeholder: "you@example.com",
        keyboard: "email-address",
      })}
      {renderField(t("password"), "password", {
        icon: "lock-outline",
        placeholder: t("yourPassword"),
        secure: true,
      })}

      <View style={localStyles.optionsRow}>
        <TouchableOpacity
          testID="login-remember-device"
          style={localStyles.rememberRow}
          onPress={() => setRememberDevice((v) => !v)}
          activeOpacity={0.85}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberDevice }}
          accessibilityLabel="Remember this device"
        >
          <MaterialCommunityIcons
            name={rememberDevice ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={rememberDevice ? K.coral : theme.textMuted}
          />
          <Text style={[localStyles.rememberText, { color: theme.text }]}>
            Remember this device
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="login-forgot-password"
          onPress={() => navigation.navigate("ForgotPassword")}
          accessibilityRole="link"
          accessibilityLabel={t("forgotPassword")}
        >
          <Text style={[localStyles.forgotText, { color: K.coralDark }]}>
            {t("forgotPassword")}
          </Text>
        </TouchableOpacity>
      </View>

      <KineticCta
        testID="login-sign-in-button"
        accessibilityLabel={t("signIn")}
        title={t("signIn")}
        onPress={handleLogin}
        loading={loading}
      />

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textMuted }]}>OR CONTINUE WITH</Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      </View>

      <TouchableOpacity
        style={[styles.googleBtn, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}
        onPress={handleGoogleLogin}
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
            <Text style={[styles.googleText, { color: theme.text }]}>{t("continueWithGoogle")}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={localStyles.secureRow}>
        <MaterialCommunityIcons name="shield-check-outline" size={16} color={K.success} />
        <Text style={[localStyles.secureText, { color: theme.textSecondary }]}>
          256-bit Bank Grade Encryption • Zero Card Details Stored
        </Text>
      </View>
    </AuthShell>
  );
};

const localStyles = StyleSheet.create({
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
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 4,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
  },
  rememberText: {
    ...kinetic.typography.caption,
    fontSize: 13,
  },
  forgotText: {
    ...kinetic.typography.caption,
    fontSize: 13,
    fontFamily: kinetic.fonts.interBold,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  secureText: {
    ...kinetic.typography.caption,
    fontSize: 11,
    textAlign: "center",
  },
});

export default LoginScreen;
