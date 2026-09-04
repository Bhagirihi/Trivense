import { NativeModules, Platform, TurboModuleRegistry } from "react-native";
import { hasCustomNativeModules } from "../utils/nativeRuntime";

const DEFAULT_WEB_CLIENT_ID =
  "265290976146-4bp383fmm2i37mlj723jd1iivr16cqki.apps.googleusercontent.com";

const DEFAULT_IOS_CLIENT_ID =
  "265290976146-lnc7pv6spst9c5be6m8e6p9blbshtsa2.apps.googleusercontent.com";

export function getGoogleWebClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_WEB_CLIENT_ID;
}

export function getGoogleIosClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || DEFAULT_IOS_CLIENT_ID;
}

let googleSignInConfigured = false;
let cachedGoogleSignInModule = undefined;

/**
 * Soft probe — never call TurboModuleRegistry.getEnforcing.
 * Requiring @react-native-google-signin/google-signin loads getEnforcing and
 * fatally crashes when RNGoogleSignin is not linked in the native binary.
 */
export function isRnGoogleSignInLinked() {
  try {
    if (TurboModuleRegistry?.get?.("RNGoogleSignin")) return true;
    if (NativeModules?.RNGoogleSignin) return true;
  } catch {
    // ignore
  }
  return false;
}

function loadGoogleSignInModule() {
  if (cachedGoogleSignInModule !== undefined) {
    return cachedGoogleSignInModule;
  }

  if (!hasCustomNativeModules() || !isRnGoogleSignInLinked()) {
    cachedGoogleSignInModule = null;
    return null;
  }

  try {
    cachedGoogleSignInModule = require("@react-native-google-signin/google-signin");
  } catch {
    cachedGoogleSignInModule = null;
  }
  return cachedGoogleSignInModule;
}

export function isNativeGoogleSignInAvailable() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  return Boolean(loadGoogleSignInModule());
}

function configureNativeGoogleSignIn(GoogleSignin) {
  if (googleSignInConfigured) return;
  GoogleSignin.configure({
    webClientId: getGoogleWebClientId(),
    iosClientId: getGoogleIosClientId(),
    offlineAccess: false,
  });
  googleSignInConfigured = true;
}

/**
 * Native Google Sign-In → returns an ID token for Supabase signInWithIdToken.
 * Does not import supabase (avoids circular dependency).
 */
export async function getGoogleIdTokenNative() {
  const googleSignIn = loadGoogleSignInModule();
  if (!googleSignIn) {
    throw new Error("Native Google Sign-In is unavailable in this build.");
  }

  const {
    GoogleSignin,
    isSuccessResponse,
    isCancelledResponse,
    statusCodes,
  } = googleSignIn;

  configureNativeGoogleSignIn(GoogleSignin);

  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return { idToken: null, error: new Error("OAuth cancelled") };
    }

    if (!isSuccessResponse(response)) {
      throw new Error("Google sign-in failed");
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error(
        "Google did not return an ID token. Check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the app."
      );
    }

    return { idToken, error: null };
  } catch (error) {
    if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
      return { idToken: null, error: new Error("OAuth cancelled") };
    }
    if (error?.code === statusCodes?.IN_PROGRESS) {
      return { idToken: null, error: new Error("Google sign-in already in progress") };
    }
    if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services is unavailable or outdated on this device.");
    }
    // Android DEVELOPER_ERROR — usually missing SHA-1 for this signing key in Firebase/Google Cloud
    const message = String(error?.message || error || "");
    if (
      error?.code === "10" ||
      message.includes("DEVELOPER_ERROR") ||
      message.includes("ApiException: 10")
    ) {
      throw new Error(
        "Google Sign-In is misconfigured for this build (SHA-1 / OAuth client). Falling back to browser sign-in."
      );
    }
    throw error;
  }
}

/** @deprecated Prefer getGoogleIdTokenNative + supabase.auth.signInWithIdToken */
export async function signInWithGoogleNative() {
  const { idToken, error } = await getGoogleIdTokenNative();
  if (error || !idToken) {
    return { data: null, error: error || new Error("Google sign-in failed") };
  }

  const { supabase } = require("../config/supabase");
  const { data, error: authError } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (authError) throw authError;
  return { data: data.session, error: null };
}
