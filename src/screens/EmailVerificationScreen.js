import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase, updateUserProfile } from "../config/supabase";
import { showToast } from "../utils/toast";
import { realTimeSync } from "../services/realTimeSync";
import { useAuth } from "../context/AuthContext";
import FormButton from "../components/common/FormButton";
import { WhatsAppNudgeIcon } from "../components/kinetic/SettlementIcons";
import { spacing, typography, kinetic } from "../theme/tokens";
import { navigateAfterRegisterAuth } from "../utils/postRegisterNavigation";

const K = kinetic.colors;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Kinetic email verification.
 *
 * The app's real flow is a Supabase email LINK: signing up sends a link,
 * and this screen watches for the verified session (kept intact below).
 * The six OTP boxes call the real supabase.auth.verifyOtp signup endpoint,
 * so they only succeed if email OTP is enabled for the project; a failed
 * attempt surfaces the Supabase error and the link flow remains available.
 * WhatsApp OTP does not exist — it renders only as a disabled coming-soon
 * row, never as a working path.
 */
const EmailVerificationScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [recheckLoading, setRecheckLoading] = useState(false);
  const [code, setCode] = useState(Array(OTP_LENGTH).fill(""));
  const [focusedBox, setFocusedBox] = useState(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef([]);
  const email = route.params?.email ?? session?.user?.email;
  const hasSession = !!session?.user;

  const checkVerificationStatus = useCallback(async () => {
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
  }, [navigation]);

  useEffect(() => {
    checkVerificationStatus();
    // Set up a listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, authSession) => {
        if (event === "SIGNED_IN" && authSession?.user?.email_confirmed_at) {
          setVerificationStatus("verified");
          showToast.success("Email verified successfully!");
          setTimeout(() => {
            navigateAfterRegisterAuth(navigation, {
              userId: authSession?.user?.id,
            });
          }, 2000);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkVerificationStatus, navigation]);

  // Set up real-time subscriptions
  useEffect(() => {
    const subscription = realTimeSync.subscribeToVerification(
      checkVerificationStatus
    );
    return () => {
      subscription?.unsubscribe?.(); // Safe call to unsubscribe
    };
  }, [checkVerificationStatus]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOpenEmail = () => {
    Linking.openURL("mailto:");
  };

  const handleResendVerification = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email || (await supabase.auth.getUser()).data.user.email,
      });

      if (error) throw error;

      setCooldown(RESEND_COOLDOWN_SECONDS);
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

  const focusBox = (index) => {
    inputRefs.current[index]?.focus();
  };

  const handleCodeChange = (index, text) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) {
      setCode((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    setCode((prev) => {
      const next = [...prev];
      for (let i = 0; i < digits.length && index + i < OTP_LENGTH; i += 1) {
        next[index + i] = digits[i];
      }
      return next;
    });
    const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
    if (digits.length > 1 || index < OTP_LENGTH - 1) focusBox(nextIndex);
  };

  const handleCodeKeyPress = (index, key) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      setCode((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
      focusBox(index - 1);
    }
  };

  const codeComplete = code.every((digit) => digit !== "");

  const handleVerifyCode = async () => {
    if (!codeComplete || verifying) return;
    if (!email) {
      showToast.error("No email address to verify. Please go back and register again.");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.join(""),
        type: "signup",
      });
      if (error) throw error;
      if (data?.user?.email_confirmed_at) {
        setVerificationStatus("verified");
        showToast.success("Email verified successfully!");
        setTimeout(() => {
          navigateAfterRegisterAuth(navigation, { userId: data.user.id });
        }, 2000);
      } else {
        showToast.info("Code accepted. Waiting for verification to finish.");
        await checkVerificationStatus();
      }
    } catch (error) {
      showToast.error(error.message || "Invalid code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const verified = verificationStatus === "verified";

  return (
    <View style={[styles.container, { backgroundColor: K.canvas }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={[styles.iconRing, { backgroundColor: K.tintBlue }]}>
            <MaterialCommunityIcons
              name={verified ? "check-circle" : "mark-email-read"}
              size={48}
              color={verified ? K.success : K.navy}
            />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Verify your email</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            We sent a 6-digit verification code to
          </Text>
          <View style={styles.emailRow}>
            <Text style={[styles.emailText, { color: theme.text }]} numberOfLines={1}>
              {email || "your email"}
            </Text>
            <TouchableOpacity
              onPress={handleBackToLogin}
              style={styles.editBtn}
              accessibilityRole="button"
              accessibilityLabel="Change email"
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={K.coralDark} />
            </TouchableOpacity>
          </View>

          <View style={styles.otpRow}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                testID={`email-verification-otp-${index}`}
                accessibilityLabel={`Verification code digit ${index + 1}`}
                style={[
                  styles.otpBox,
                  {
                    borderColor:
                      focusedBox === index
                        ? K.coral
                        : digit
                          ? K.borderStrong
                          : theme.border,
                    backgroundColor: digit ? K.tintBlue : theme.inputBackground,
                    color: theme.text,
                  },
                ]}
                value={digit}
                onChangeText={(text) => handleCodeChange(index, text)}
                onKeyPress={({ nativeEvent }) =>
                  handleCodeKeyPress(index, nativeEvent.key)
                }
                onFocus={() => setFocusedBox(index)}
                onBlur={() => setFocusedBox(null)}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.statusContainer}>
            {verificationStatus === "pending" ? (
              <ActivityIndicator size="small" color={K.navy} />
            ) : null}
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              {verificationStatus === "pending"
                ? "Waiting for verification..."
                : "Email verified successfully!"}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              testID="email-verify-continue-button"
              onPress={handleVerifyCode}
              disabled={!codeComplete || verifying || verified}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Verify and Continue"
              accessibilityState={{
                disabled: !codeComplete || verifying || verified,
                busy: verifying,
              }}
              style={[styles.ctaWrap, (!codeComplete || verifying || verified) && styles.disabled]}
            >
              <LinearGradient
                colors={K.coralGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {verifying ? (
                  <ActivityIndicator color={K.textInverse} style={styles.spinner} />
                ) : null}
                <Text style={styles.ctaText}>Verify & Continue</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={K.textInverse} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {cooldown > 0 ? (
                <Text style={[styles.resendText, { color: theme.textSecondary }]}>
                  Resend code in 00:{String(cooldown).padStart(2, "0")}s
                </Text>
              ) : (
                <>
                  <Text style={[styles.resendText, { color: theme.textSecondary }]}>
                    Didn&apos;t receive code?{" "}
                  </Text>
                  <TouchableOpacity
                    testID="email-verification-resend-otp"
                    onPress={handleResendVerification}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Resend OTP"
                  >
                    <Text style={[styles.resendLink, { color: K.coralDark }]}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              testID="email-verify-whatsapp-soon"
              style={[
                styles.altCard,
                { borderColor: theme.border, backgroundColor: theme.inputBackground },
              ]}
              disabled
              activeOpacity={1}
              accessibilityRole="button"
              accessibilityLabel="Verify via WhatsApp OTP, coming soon"
              accessibilityState={{ disabled: true }}
            >
              <WhatsAppNudgeIcon size={28} />
              <View style={styles.altTextWrap}>
                <Text style={[styles.altTitle, { color: theme.textSecondary }]}>
                  Verify via WhatsApp OTP
                </Text>
                <Text style={[styles.altBody, { color: theme.textMuted }]}>
                  Instant 6-digit code via official chatbot
                </Text>
              </View>
              <View style={[styles.soonPill, { backgroundColor: K.tintAmber }]}>
                <Text style={[styles.soonText, { color: K.warning }]}>Coming soon</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.infoRow, { backgroundColor: K.tintBlue }]}>
              <MaterialCommunityIcons name="information-outline" size={18} color={K.upiBlue} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Check your spam or junk folder if the email doesn&apos;t appear in
                your inbox within 60 seconds. Never share your 6-digit code with
                anyone. Trivense will never ask for your OTP.
              </Text>
            </View>

            <FormButton title="Open email app" onPress={handleOpenEmail} size="large" />
            <FormButton
              title="Resend verification"
              variant="outline"
              onPress={handleResendVerification}
              loading={loading}
              disabled={cooldown > 0}
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
    borderRadius: kinetic.radii.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: "center",
    ...kinetic.shadows.card,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...kinetic.typography.headingLarge,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    ...kinetic.typography.body,
    textAlign: "center",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  emailText: {
    ...kinetic.typography.bodyMedium,
  },
  editBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: kinetic.radii.md,
    textAlign: "center",
    fontFamily: kinetic.fonts.jakartaBold,
    fontSize: 22,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statusText: { ...typography.caption, fontWeight: "500" },
  buttonContainer: { width: "100%", gap: spacing.md },
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
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  resendText: {
    ...kinetic.typography.body,
  },
  resendLink: {
    ...kinetic.typography.bodyMedium,
  },
  altCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: kinetic.radii.md,
    padding: spacing.md,
    opacity: 0.75,
  },
  altTextWrap: { flex: 1, gap: 2 },
  altTitle: {
    fontFamily: kinetic.fonts.jakartaSemiBold,
    fontSize: 14,
  },
  altBody: {
    ...kinetic.typography.caption,
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
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: kinetic.radii.md,
    padding: spacing.md,
  },
  infoText: {
    ...kinetic.typography.caption,
    flex: 1,
    lineHeight: 17,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  logoutText: { ...typography.label },
});

export default EmailVerificationScreen;
