/**
 * Firebase project metadata for Trivense.
 * Console: https://console.firebase.google.com/project/trivense-app-prod
 *
 * SDK configs live in /firebase (google-services.json, GoogleService-Info.plist).
 * Copy into native builds when integrating @react-native-firebase or expo prebuild.
 */
export const FIREBASE_PROJECT = {
  projectId: "trivense-app-prod",
  projectNumber: "265290976146",
  storageBucket: "trivense-app-prod.firebasestorage.app",
  consoleUrl: "https://console.firebase.google.com/project/trivense-app-prod/overview",
};

export const FIREBASE_APPS = {
  android: {
    displayName: "Trivense Android",
    packageName: "com.trivense.app",
    appId: "1:265290976146:android:3a532a2acc6284bba9cf4b",
  },
  ios: {
    displayName: "Trivense iOS",
    bundleId: "com.trivense.app",
    appId: "1:265290976146:ios:b3001b00040c6622a9cf4b",
  },
};
