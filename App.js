import React, { useEffect, useState, useCallback } from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import { SubscriptionProvider } from "./src/context/SubscriptionContext";
import { AdPolicyProvider } from "./src/context/AdPolicyContext";
import { AppCueProvider } from "./src/context/AppCueContext";
import AppCueOverlay from "./src/components/AppCueOverlay";
import ReferralBootstrap from "./src/components/ReferralBootstrap";
import { supabase, createSessionFromUrl } from "./src/config/supabase";
import * as Linking from "expo-linking";
import {
  extractReferralCodeFromUrl,
  setPendingReferralCode,
} from "./src/utils/referralStorage";
import Toast from "react-native-toast-message";
import { AppSettingsProvider } from "./src/context/AppSettingsContext";
// import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Asset } from "expo-asset";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import EmailVerificationScreen from "./src/screens/EmailVerificationScreen";
// Import all screens

import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ExpenseScreen } from "./src/screens/ExpenseScreen";
import { AddExpenseScreen } from "./src/screens/AddExpenseScreen";
import { ExpenseBoardScreen } from "./src/screens/ExpenseBoardScreen";
import { ExpenseBoardDetailsScreen } from "./src/screens/ExpenseBoardDetailsScreen";
import { CreateExpenseBoardScreen } from "./src/screens/CreateExpenseBoardScreen";
import { CategoriesScreen } from "./src/screens/CategoriesScreen";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import { AnalysisScreen } from "./src/screens/AnalysisScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import PostRegisterSetupScreen from "./src/screens/PostRegisterSetupScreen";
import { NotificationScreen } from "./src/screens/NotificationScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { InvitationsScreen } from "./src/screens/InvitationsScreen";
import { AddCategoryScreen } from "./src/screens/AddCategoryScreen";
import { ExpenseDetailsScreen } from "./src/screens/ExpenseDetailsScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import * as SplashScreen from "expo-splash-screen";

import { showToast } from "./src/utils/toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { useAdsBootstrap } from "./src/hooks/useAds";
import {
  handleBackgroundNotifications,
  handleForegroundNotifications,
  registerForPushNotificationsAsync,
} from "./src/services/pushNotificationService";
import { expenseBoardService } from "./src/services/expenseBoardService";
import { subscriptionService } from "./src/services/subscriptionService";
import { appConfigService } from "./src/services/appConfigService";
import { bootstrapPlayStoreReferralInvite } from "./src/services/installReferrerService";
import {
  isPostRegisterSetupPending,
  shouldShowPostRegisterSetup,
} from "./src/utils/postRegisterSetupStorage";
import { isOnboardingComplete } from "./src/utils/onboardingStorage";
import { NetworkProvider } from "./src/context/NetworkContext";
import OfflineBanner from "./src/components/OfflineBanner";
import OfflineExpenseSync from "./src/components/OfflineExpenseSync";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

// Initialize native stack navigator
const Stack = createNativeStackNavigator();

/** Routes that exist only on the authenticated stack (never use Login here). */
const AUTHENTICATED_BOOT_ROUTES = new Set([
  "EmailVerification",
  "PostRegisterSetup",
  "Onboarding",
  "Dashboard",
]);

function getStackInitialRoute(session, bootRoute) {
  if (!session) {
    if (bootRoute === "Onboarding") return "Onboarding";
    return "Login";
  }
  if (bootRoute && AUTHENTICATED_BOOT_ROUTES.has(bootRoute)) return bootRoute;
  if (!session.user?.email_confirmed_at) return "EmailVerification";
  return "Dashboard";
}

function AdsBootstrap({ enabled }) {
  useAdsBootstrap(enabled);
  return null;
}

const config = {
  animation: "spring",
  config: {
    stiffness: 1000,
    damping: 50,
    mass: 3,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: "transparent" },
  cardOverlayEnabled: true,
  cardStyleInterpolator: ({ current: { progress } }) => ({
    cardStyle: {
      opacity: progress.interpolate({
        inputRange: [0, 0.5, 0.9, 1],
        outputRange: [0, 0.25, 0.7, 1],
      }),
      transform: [
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    },
    overlayStyle: {
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  }),
  transitionSpec: {
    open: config,
    close: config,
  },
};

const AppContent = () => {
  const [session, setSession] = useState(null);
  const [appIsReady, setAppIsReady] = useState(false);
  const [bootRoute, setBootRoute] = useState(null);
  const [fontsLoaded] = Font.useFonts({
    "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      // Keep bootRoute in sync on the same tick as session so the auth stack
      // never remounts with initialRouteName="Login" (TRIVENSE-MOBILE-5 crash).
      if (!nextSession) {
        isOnboardingComplete().then((done) => {
          setBootRoute(done ? "Login" : "Onboarding");
        });
        return;
      }
      if (!nextSession.user?.email_confirmed_at) {
        setBootRoute("EmailVerification");
        return;
      }
      setBootRoute((prev) =>
        prev && AUTHENTICATED_BOOT_ROUTES.has(prev) ? prev : "Dashboard"
      );
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle auth and sharing deep links
  useEffect(() => {
    const handleUrl = async (url) => {
      if (!url) return;

      if (
        url.includes("auth/callback") ||
        url.includes("verify-email") ||
        url.includes("reset-password")
      ) {
        await createSessionFromUrl(url);
        return;
      }

      const referralCode = extractReferralCodeFromUrl(url);
      if (referralCode) {
        await setPendingReferralCode(referralCode);
        showToast.info(
          "Referral code saved",
          "Sign up to get 7 days of Premium for you and your friend"
        );
        return;
      }

      if (url.includes("/join/")) {
        const code = url.split("/join/").pop()?.split("?")[0]?.trim();
        if (!code) return;

        try {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          if (!currentSession?.user) {
            showToast.info("Sign in required", "Log in to join this board");
            return;
          }

          const { paymentsEnabled } = await appConfigService.fetchConfig();
          if (paymentsEnabled) {
            const subscription = await subscriptionService.getEffectiveSubscription(
              currentSession.user.id
            );
            const joinCheck = await subscriptionService.canJoinSharedBoard(
              subscription,
              currentSession.user.id
            );
            if (!joinCheck.allowed) {
              showToast.info(
                "Premium required",
                "Upgrade to join more shared boards"
              );
              return;
            }
          }

          const result = await expenseBoardService.joinBoard(code);
          showToast.success(
            "Board joined",
            result?.board_name
              ? `You joined "${result.board_name}"`
              : "Shared board added to your list"
          );
        } catch (error) {
          showToast.error("Could not join board", error.message);
        }
      }
    };

    Linking.getInitialURL().then((url) => url && handleUrl(url));
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        //  await SplashScreen.preventAutoHideAsync();
        await Asset.loadAsync([require("./assets/icon.png")]);
        await Font.loadAsync({
          Inter_Bold: require("./assets/fonts/Inter_Bold.ttf"),
          Inter_Medium: require("./assets/fonts/Inter_Medium.ttf"),
          Inter_Regular: require("./assets/fonts/Inter_Regular.ttf"),
          "Manrope-Bold": require("./assets/fonts/Manrope-Bold.ttf"),
          "Manrope-Medium": require("./assets/fonts/Manrope-Medium.ttf"),

          "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
          "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
          "Poppins-Light": require("./assets/fonts/Poppins-Light.ttf"),
          "Poppins-ExtraLight": require("./assets/fonts/Poppins-ExtraLight.ttf"),
          "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
          "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
          "Poppins-Thin": require("./assets/fonts/Poppins-Thin.ttf"),
          "Poppins-ExtraBold": require("./assets/fonts/Poppins-ExtraBold.ttf"),
        });

        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session ?? null);

        if (!session) {
          const onboardingDone = await isOnboardingComplete();
          setBootRoute(onboardingDone ? "Login" : "Onboarding");
        } else if (!session.user?.email_confirmed_at) {
          setBootRoute("EmailVerification");
        } else if (
          session.user?.id &&
          (await shouldShowPostRegisterSetup(session.user.id))
        ) {
          setBootRoute("PostRegisterSetup");
        } else {
          setBootRoute("Dashboard");
        }

        await bootstrapPlayStoreReferralInvite();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (!appIsReady) return;

    let active = true;

    (async () => {
      if (!session) {
        const onboardingDone = await isOnboardingComplete();
        if (active) setBootRoute(onboardingDone ? "Login" : "Onboarding");
        return;
      }

      if (!session.user?.email_confirmed_at) {
        if (active) setBootRoute("EmailVerification");
        return;
      }

      if (
        session.user?.id &&
        (await shouldShowPostRegisterSetup(session.user.id))
      ) {
        if (active) setBootRoute("PostRegisterSetup");
        return;
      }

      if (active) setBootRoute("Dashboard");
    })();

    return () => {
      active = false;
    };
  }, [appIsReady, session?.user?.id, session?.user?.email_confirmed_at]);

  useEffect(() => {
    if (!session?.user?.id) return;

    let active = true;

    (async () => {
      const pendingSetup = await isPostRegisterSetupPending();
      if (!active || pendingSetup) return;

      registerForPushNotificationsAsync({ requestPermission: false });
      handleForegroundNotifications();
      handleBackgroundNotifications();
    })();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      SplashScreen.hide();
    }
  }, [appIsReady]);

  if (!appIsReady || !bootRoute) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      {/* <StatusBar
        barStyle={
          theme.background === "#FFFFFF" ? "dark-content" : "light-content"
        }
        backgroundColor={theme.background}
      /> */}
      <AuthProvider>
          <NetworkProvider>
          <SubscriptionProvider>
            <AppSettingsProvider>
            <AdPolicyProvider>
            <AdsBootstrap enabled={Boolean(session?.user?.email_confirmed_at)} />
            <ReferralBootstrap />
            <AppCueProvider>
            <OfflineBanner />
            <OfflineExpenseSync />
            <NavigationContainer>
              <Stack.Navigator
                key={session ? "auth-stack" : "guest-stack"}
                screenOptions={screenOptions}
                initialRouteName={getStackInitialRoute(session, bootRoute)}
              >
                {session ? (
                  // Protected routes (unverified users see EmailVerification first)
                  <>
                    <Stack.Screen
                      name="EmailVerification"
                      component={EmailVerificationScreen}
                    />
                    <Stack.Screen
                      name="PostRegisterSetup"
                      component={PostRegisterSetupScreen}
                      options={{ gestureEnabled: false }}
                    />
                    <Stack.Screen
                      name="Onboarding"
                      component={OnboardingScreen}
                      options={{ gestureEnabled: false }}
                    />
                    <Stack.Screen
                      name="Dashboard"
                      component={DashboardScreen}
                    />
                    <Stack.Screen name="Expense" component={ExpenseScreen} />
                    <Stack.Screen
                      name="AddExpense"
                      component={AddExpenseScreen}
                    />
                    <Stack.Screen
                      name="ExpenseBoard"
                      component={ExpenseBoardScreen}
                    />
                    <Stack.Screen
                      name="ExpenseBoardDetails"
                      component={ExpenseBoardDetailsScreen}
                    />
                    <Stack.Screen
                      name="ExpenseDetails"
                      component={ExpenseDetailsScreen}
                    />
                    <Stack.Screen
                      name="CreateExpenseBoard"
                      component={CreateExpenseBoardScreen}
                    />
                    <Stack.Screen
                      name="Categories"
                      component={CategoriesScreen}
                    />
                    <Stack.Screen
                      name="AddCategory"
                      component={AddCategoryScreen}
                    />
                    <Stack.Screen
                      name="Analytics"
                      component={AnalyticsScreen}
                    />
                    <Stack.Screen name="Analysis" component={AnalysisScreen} />
                    <Stack.Screen
                      name="Notification"
                      component={NotificationScreen}
                    />
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen
                      name="Invitations"
                      component={InvitationsScreen}
                    />
                    <Stack.Screen name="Paywall" component={PaywallScreen} />
                  </>
                ) : (
                  // Public routes — value slides before Login for first installs
                  <>
                    <Stack.Screen
                      name="Onboarding"
                      component={OnboardingScreen}
                      options={{ gestureEnabled: false }}
                    />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen
                      name="EmailVerification"
                      component={EmailVerificationScreen}
                    />
                    {/* EmailVerification in both stacks: public (e.g. after login "Email not confirmed") and protected (unverified session) */}
                    <Stack.Screen
                      name="ForgotPassword"
                      component={ForgotPasswordScreen}
                    />
                  </>
                )}
              </Stack.Navigator>
              <AppCueOverlay />
              <Toast />
            </NavigationContainer>
            </AppCueProvider>
            </AdPolicyProvider>
          </AppSettingsProvider>
          </SubscriptionProvider>
          </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
