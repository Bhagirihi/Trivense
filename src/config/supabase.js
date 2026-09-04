import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import { crypto } from "expo-crypto";
import { showToast } from "../utils/toast";
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}

import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import {
  getGoogleIdTokenNative,
  isNativeGoogleSignInAvailable,
} from "../services/googleAuthService";
//Live
export const TRIVENSE_SUPABASE_PROJECT_REF = "pvuybefxxtjwxpqhmgkw";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseProjectRef(url = supabaseUrl) {
  return url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

export function getSupabaseConfigError(url = supabaseUrl) {
  const ref = getSupabaseProjectRef(url);
  if (!url || !ref) {
    return "Supabase URL is missing or invalid. Set EXPO_PUBLIC_SUPABASE_URL in your build env.";
  }
  if (ref !== TRIVENSE_SUPABASE_PROJECT_REF) {
    return `This build points at Supabase project "${ref}" but Trivense uses "${TRIVENSE_SUPABASE_PROJECT_REF}". Update EAS production env and rebuild the app.`;
  }
  return null;
}

//const supabaseUrl = Constants.expoConfig.extra.supabaseUrl;
//const supabaseAnonKey = Constants.expoConfig.extra.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
  realtime: {
    // (since v2.47) explicitly tell Realtime which WS implementation to use
    WebSocket: global.WebSocket,
  },
});

// Connection status check
export const checkSupabaseConnection = async () => {
  try {
    // Try to fetch a simple query to check connection
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1)
      .single();

    if (error) {
      console.error("Supabase connection error:", error.message);
      return {
        isConnected: false,
        error: error.message,
        status: "error",
      };
    }

    return {
      isConnected: true,
      error: null,
      status: "connected",
    };
  } catch (error) {
    console.error("Supabase connection check failed:", error.message);
    return {
      isConnected: false,
      error: error.message,
      status: "error",
    };
  }
};

// Authentication helpers
export const signUpWithEmail = async (email, password, userData) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: "trivense://verify-email",
      },
    });

    if (error) throw error;

    // The profile will be created automatically by the trigger
    // No need to manually create it here

    return { data, error: null };
  } catch (error) {
    console.error("SignUp error:", error.message);
    return { data: null, error };
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Fetch user profile
    if (data?.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;

      return { data: { ...data, profile }, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.error("SignIn error:", error.message);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("SignOut error:", error.message);
    return { error };
  }
};

const parseOAuthCallbackUrl = (url) => {
  if (!url) return { params: {}, errorCode: null, errorDescription: null };

  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (params.access_token || params.code) {
    return { params, errorCode: errorCode || params.error || null, errorDescription: params.error_description || null };
  }

  const hash = url.includes("#") ? url.split("#")[1] : "";
  const query = url.includes("?") ? url.split("?").pop().split("#")[0] : "";
  const legacy = Object.fromEntries(new URLSearchParams(hash || query));
  return {
    params: legacy,
    errorCode: legacy.error || errorCode || null,
    errorDescription: legacy.error_description || null,
  };
};

/**
 * Create a session from OAuth redirect URL (PKCE code or implicit tokens).
 * Call this when the app is opened via deep link from the OAuth callback.
 */
export const createSessionFromUrl = async (url) => {
  const { params, errorCode, errorDescription } = parseOAuthCallbackUrl(url);

  if (errorCode) {
    const message =
      errorDescription ||
      (errorCode === "provider is not enabled"
        ? "Google sign-in is not enabled yet. Enable Google in Supabase Auth providers."
        : errorCode);
    return { data: null, error: new Error(message) };
  }

  if (params.code) {
    const code = String(params.code).replace(/(%23|#)+$/g, "");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { data: null, error };
    return { data: data.session, error: null };
  }

  if (params.access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token || "",
    });
    if (error) return { data: null, error };
    return { data: data.session, error: null };
  }

  return { data: null, error: new Error("No auth code or token in callback URL") };
};

/**
 * Sign in with Google using OAuth (opens in-app browser).
 * Requires: Supabase Dashboard > Auth > Providers > Google enabled,
 * and redirect URL (e.g. trivense://**) added in Auth > URL Configuration.
 */
export const getGoogleOAuthRedirectUri = () =>
  AuthSession.makeRedirectUri({
    scheme: "trivense",
    path: "auth/callback",
  });

const getSessionAfterOAuth = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

export const signInWithGoogleOAuth = async () => {
  WebBrowser.maybeCompleteAuthSession();

  const redirectTo = getGoogleOAuthRedirectUri();

  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (oauthError) throw oauthError;
  if (!data?.url) {
    throw new Error(
      "Google sign-in is unavailable. Enable Google in Supabase Auth → Providers."
    );
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success" && result.url) {
    const { data: sessionData, error: sessionError } = await createSessionFromUrl(
      result.url
    );
    if (sessionError) throw sessionError;
    return { data: sessionData, error: null };
  }

  if (result.type === "cancel" || result.type === "dismiss") {
    const session = await getSessionAfterOAuth();
    if (session) return { data: session, error: null };
    return { data: null, error: new Error("OAuth cancelled") };
  }

  const session = await getSessionAfterOAuth();
  if (session) return { data: session, error: null };

  return { data: null, error: new Error("OAuth cancelled or failed") };
};

const isGoogleCancelled = (error) =>
  String(error?.message || "")
    .toLowerCase()
    .includes("cancelled");

export const signInWithGoogle = async () => {
  try {
    const configError = getSupabaseConfigError();
    if (configError) {
      throw new Error(configError);
    }

    if (isNativeGoogleSignInAvailable()) {
      try {
        const { idToken, error: nativeError } = await getGoogleIdTokenNative();
        if (nativeError) {
          if (isGoogleCancelled(nativeError)) {
            return { data: null, error: nativeError };
          }
          throw nativeError;
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;
        return { data: data.session, error: null };
      } catch (nativeError) {
        if (isGoogleCancelled(nativeError)) {
          return { data: null, error: nativeError };
        }
        console.warn(
          "Native Google Sign-In failed, falling back to browser OAuth:",
          nativeError?.message || nativeError
        );
      }
    }

    return await signInWithGoogleOAuth();
  } catch (error) {
    console.error("Google sign-in error:", error?.message);
    return { data: null, error };
  }
};

export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "trivense://reset-password",
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Reset password error:", error.message);
    return { error };
  }
};

// User profile helpers
export const updateUserProfile = async (updates) => {
  console.log("data updatedData ini");
  try {
    const { data } = await supabase.auth.getUser();
    console.log("user updateUserProfile");
    const { data: updatedData, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date() })
      .eq("id", data.user?.id);

    if (error) throw error;
    showToast.success("Profile updated successfully");
  } catch (error) {
    console.error("Update profile error:", error.message);
    return { data: null, error };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Get profile error:", error.message);
    return { data: null, error };
  }
};

// Session management
export const getSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return { session };
  } catch (error) {
    console.error("Error getting session:", error.message);
    return { session: null };
  }
};

/**
 * Verification helpers (Supabase Edge Functions).
 * Requires Edge Functions "send-otp" and "verify-otp" to be deployed in your Supabase project.
 * Deploy via: supabase functions deploy send-otp; supabase functions deploy verify-otp
 * If not deployed, these will return an error (callers should handle gracefully).
 */
export const sendVerificationOTP = async (type, value) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { type, value },
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error?.message
        ? error
        : new Error("OTP send unavailable. Deploy Edge Function 'send-otp' to enable."),
    };
  }
};

export const verifyOTP = async (type, value, code) => {
  try {
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { type, value, code },
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error?.message
        ? error
        : new Error("OTP verify unavailable. Deploy Edge Function 'verify-otp' to enable."),
    };
  }
};
