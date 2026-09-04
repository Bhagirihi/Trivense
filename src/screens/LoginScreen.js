import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { supabase, signInWithGoogle } from "../config/supabase";
import { showNetworkAwareError } from "../utils/toast";
import { isValidEmail } from "../utils/validation";
import AuthShell from "../components/ui/AuthShell";
import FormButton from "../components/common/FormButton";
import { createAuthFormStyles } from "../components/ui/authFormStyles";
import { useTranslation } from "../hooks/useTranslation";
import { LEGAL_URLS } from "../config/legalContent";

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!isValidEmail(formData.email)) newErrors.email = "Please enter a valid email";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
          navigation.reset({
            index: 0,
            routes: [{ name: "EmailVerification", params: { email: formData.email.trim() } }],
          });
          return;
        }
        await showNetworkAwareError(error.message || "Failed to login");
        return;
      }
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
            style={styles.eyeBtn}
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
      showSubtitle={false}
      footer={
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
            <Text style={[styles.footerLink, { color: theme.primary }]}>{t("createAccount")}</Text>
          </TouchableOpacity>
        </View>
      }
    >
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

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textMuted }]}>{t("orSignInWithEmail")}</Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      </View>

      {renderField(t("email"), "email", {
        icon: "email-outline",
        placeholder: "you@example.com",
        keyboard: "email-address",
      })}
      {renderField(t("password"), "password", {
        icon: "lock-outline",
        placeholder: t("yourPassword"),
        secure: true,
      })}

      <TouchableOpacity
        testID="login-forgot-password"
        style={styles.forgot}
        onPress={() => navigation.navigate("ForgotPassword")}
        accessibilityRole="link"
        accessibilityLabel={t("forgotPassword")}
      >
        <Text style={[styles.forgotText, { color: theme.primary }]}>{t("forgotPassword")}</Text>
      </TouchableOpacity>

      <FormButton
        testID="login-sign-in-button"
        accessibilityLabel={t("signIn")}
        title={t("signIn")}
        onPress={handleLogin}
        loading={loading}
        size={compact ? "medium" : "large"}
        style={styles.submitBtn}
      />

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
    </AuthShell>
  );
};

export default LoginScreen;
