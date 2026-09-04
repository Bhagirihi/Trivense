import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, updateUserProfile } from "../config/supabase";
import { showToast } from "../utils/toast";
import { realTimeSync } from "../services/realTimeSync";
import { useAuth } from "../context/AuthContext";
import FormButton from "../components/common/FormButton";
import { radii, spacing, typography } from "../theme/tokens";
import { navigateAfterRegisterAuth } from "../utils/postRegisterNavigation";

const EmailVerificationScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [recheckLoading, setRecheckLoading] = useState(false);
  const email = route.params?.email ?? session?.user?.email;
  const hasSession = !!session?.user;

  useEffect(() => {
    checkVerificationStatus();
    // Set up a listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
          setVerificationStatus("verified");
          showToast.success("Email verified successfully!");
          setTimeout(() => {
            navigateAfterRegisterAuth(navigation, {
              userId: session?.user?.id,
            });
          }, 2000);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const subscription = realTimeSync.subscribeToVerification(
      checkVerificationStatus
    );
    return () => {
      subscription?.unsubscribe?.(); // Safe call to unsubscribe
    };
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error:", error.message);
        return;
      }

      const user = data?.user;

      if (user?.email_confirmed_at) {
        setVerificationStatus("verified");
        showToast.success("Email verified successfully!");
        setTimeout(() => {
          navigateAfterRegisterAuth(navigation, { userId: user?.id });
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    }
  };

  const handleOpenEmail = () => {
    Linking.openURL("mailto:");
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email || (await supabase.auth.getUser()).data.user.email,
      });

      if (error) throw error;

      showToast.success("Verification email resent successfully!");
    } catch (error) {
      console.error("Error resending verification:", error);
      showToast.error(error.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleReCheckVerification = async () => {
    setRecheckLoading(true);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      if (user?.email_confirmed_at) {
        setVerificationStatus("verified");
        showToast.success("Email verified successfully!");
        // Update user profile to trigger any necessary updates
        await updateUserProfile({ updated_at: new Date() });
        setTimeout(() => {
          navigateAfterRegisterAuth(navigation, { userId: user?.id });
        }, 2000);
      } else {
        showToast.info("Email not verified yet. Please check your inbox.");
      }
    } catch (error) {
      console.error("Error re-checking verification:", error);
      showToast.error("Failed to check verification status");
    } finally {
      setRecheckLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // App will switch to public stack (Login) via auth state change
    } catch (error) {
      showToast.error(error.message || "Failed to sign out");
    }
  };

  const handleBackToLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.iconRing,
              {
                backgroundColor: theme.primaryMuted,
                borderColor: theme.primary,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={verificationStatus === "verified" ? "check-circle" : "email-outline"}
              size={48}
              color={verificationStatus === "verified" ? theme.success : theme.primary}
            />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Verify your email</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {email
              ? `We sent a verification link to ${email}. Open your inbox to continue.`
              : "We sent a verification link to your email. Open your inbox to continue."}
          </Text>

          <View style={styles.statusContainer}>
            {verificationStatus === "pending" ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : null}
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {verificationStatus === "pending"
                ? "Waiting for verification..."
                : "Email verified successfully!"}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <FormButton title="Open email app" onPress={handleOpenEmail} size="large" />
            <FormButton
              title="Resend verification"
              variant="outline"
              onPress={handleResendVerification}
              loading={loading}
            />
            <FormButton
              title="Re-check status"
              variant="secondary"
              onPress={handleReCheckVerification}
              loading={recheckLoading}
            />
            {hasSession ? (
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={18} color={theme.error} />
                <Text style={[styles.logoutText, { color: theme.error }]}>Log out</Text>
              </TouchableOpacity>
            ) : (
              <FormButton
                title="Back to login"
                variant="outline"
                onPress={handleBackToLogin}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    paddingBottom: 40,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: "center",
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, textAlign: "center", marginBottom: spacing.sm },
  message: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statusText: { ...typography.caption, fontWeight: "500" },
  buttonContainer: { width: "100%", gap: spacing.md },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  logoutText: { ...typography.label },
});

export default EmailVerificationScreen;
