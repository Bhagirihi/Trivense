import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../config/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { showToast } from "../utils/toast";
import { isValidEmail } from "../utils/validation";
import AuthShell from "../components/ui/AuthShell";
import FormButton from "../components/common/FormButton";
import { spacing, typography } from "../theme/tokens";

const ForgotPasswordScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

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
      subtitle="Enter your email and we'll send reset instructions"
      footer={
        <TouchableOpacity
          testID="forgot-back-login"
          style={styles.backLink}
          onPress={() => navigation.navigate("Login")}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back to sign in</Text>
        </TouchableOpacity>
      }
    >
      <Text style={[styles.label, { color: theme.text }]}>Email</Text>
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
      </View>
      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
      <View style={styles.submitWrap}>
        <FormButton
          testID="forgot-submit-button"
          title="Send reset link"
          onPress={handleResetPassword}
          loading={loading}
          size="large"
        />
      </View>
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
  submitWrap: { marginTop: spacing.xl },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  backText: { ...typography.label },
});

export default ForgotPasswordScreen;
