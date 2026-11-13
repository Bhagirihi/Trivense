import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../config/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { showToast } from "../utils/toast";
import { isValidEmail } from "../utils/validation";
import { AuthShell } from "../components/ui/AuthShell";
import { spacing, typography, kinetic } from "../theme/tokens";

const K = kinetic.colors;

/**
 * Kinetic forgot-password. Flow unchanged: Supabase resetPasswordForEmail
 * with the trivense://reset-password redirect, then back to Login.
 * "Try another verification method" has no real backend yet, so it renders
 * as a disabled coming-soon affordance instead of a fake recovery path.
 */
const ForgotPasswordScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validEmail = isValidEmail(email.trim());

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: "trivense://reset-password" }
      );
      if (resetError) throw resetError;
      showToast.success("Password reset instructions sent to your email");
      navigation.navigate("Login");
    } catch (err) {
      showToast.error(err.message || "Failed to send reset instructions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      testID="screen-forgot-password"
      title="Reset password"
      subtitle="No worries! Enter your registered details and we'll send you instant recovery instructions."
      footer={
        <View>
          <View style={styles.secureRow}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={K.success} />
            <Text style={[styles.secureText, { color: theme.textSecondary }]}>
              256-BIT BANK-GRADE ENCRYPTION
            </Text>
          </View>
          <TouchableOpacity
            testID="forgot-back-login"
            style={styles.backLink}
            onPress={() => navigation.navigate("Login")}
            accessibilityRole="link"
            accessibilityLabel="Back to Log In"
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={K.coralDark} />
            <Text style={[styles.backText, { color: K.coralDark }]}>Back to Log In</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={[styles.label, { color: theme.text }]}>Registered Email</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.inputBackground,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
      >
        <MaterialCommunityIcons name="email-outline" size={20} color={theme.textMuted} />
        <TextInput
          testID="forgot-email-input"
          accessibilityLabel="Registered Email"
          style={[styles.input, { color: theme.text }]}
          placeholder="you@example.com"
          placeholderTextColor={theme.textMuted}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {validEmail ? (
          <MaterialCommunityIcons name="check-circle" size={20} color={K.success} />
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
      <View style={styles.vaultNote}>
        <MaterialCommunityIcons name="check" size={16} color={K.success} />
        <Text style={[styles.vaultText, { color: theme.textSecondary }]}>
          We will verify your identity linked to your Trivense UPI vaults.
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: K.tintBlue }]}>
        <MaterialCommunityIcons name="lightbulb-outline" size={20} color={K.upiBlue} />
        <View style={styles.infoTextWrap}>
          <Text style={[styles.infoTitle, { color: K.navy }]}>Fast-track link</Text>
          <Text style={[styles.infoBody, { color: theme.textSecondary }]}>
            Reset links remain secure and valid for 15 minutes. Check your spam
            or updates folder if not in primary inbox.
          </Text>
        </View>
      </View>

      <View style={styles.submitWrap}>
        <TouchableOpacity
          testID="forgot-submit-button"
          accessibilityRole="button"
          accessibilityLabel="Send reset link"
          accessibilityState={{ disabled: loading, busy: loading }}
          onPress={handleResetPassword}
          disabled={loading}
          activeOpacity={0.88}
          style={[styles.ctaWrap, loading && styles.disabled]}
        >
          <LinearGradient
            colors={K.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading ? (
              <ActivityIndicator color={K.textInverse} style={styles.spinner} />
            ) : null}
            <Text style={styles.ctaText}>Send reset link</Text>
            <MaterialCommunityIcons name="send" size={18} color={K.textInverse} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        testID="forgot-alt-method-button"
        style={[styles.altBtn, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}
        disabled
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Try another verification method, coming soon"
        accessibilityState={{ disabled: true }}
      >
        <MaterialCommunityIcons name="fingerprint" size={20} color={theme.textMuted} />
        <Text style={[styles.altText, { color: theme.textSecondary }]}>
          Try another verification method
        </Text>
        <View style={[styles.soonPill, { backgroundColor: K.tintAmber }]}>
          <Text style={[styles.soonText, { color: K.warning }]}>Coming soon</Text>
        </View>
      </TouchableOpacity>
    </AuthShell>
  );
};

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: spacing.sm },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.md },
  error: { fontSize: 12, marginTop: spacing.xs },
  vaultNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  vaultText: {
    ...kinetic.typography.caption,
    flex: 1,
    lineHeight: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderRadius: kinetic.radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoTextWrap: { flex: 1, gap: 2 },
  infoTitle: {
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 14,
  },
  infoBody: {
    ...kinetic.typography.body,
    lineHeight: 19,
  },
  submitWrap: { marginTop: spacing.xl },
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
  spinner: { marginRight: 8 },
  disabled: { opacity: 0.6 },
  altBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: kinetic.radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    marginTop: spacing.md,
    opacity: 0.75,
  },
  altText: {
    ...kinetic.typography.bodyMedium,
    flex: 1,
  },
  soonPill: {
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  soonText: {
    fontFamily: kinetic.fonts.interBold,
    fontSize: 10,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: spacing.md,
  },
  secureText: {
    ...kinetic.typography.captionBold,
    letterSpacing: 0.5,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44,
  },
  backText: { ...typography.label },
});

export default ForgotPasswordScreen;
