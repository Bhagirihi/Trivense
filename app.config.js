import "dotenv/config";

// Production builds must ship the real AdMob app IDs: falling back to
// Google's test IDs silently serves test ads to real users. Dev / Expo Go
// builds keep the test IDs so local work needs no AdMob setup.
const isProductionBuild =
  process.env.EAS_BUILD_PROFILE === "production" ||
  process.env.APP_ENV === "production";

function admobAppId(value, name, testId) {
  if (value) return value;
  if (isProductionBuild) {
    throw new Error(
      `Missing ${name} for a production build. Set it in EAS env ` +
        `(eas env:create --environment production --name ${name}) or .env. ` +
        `Refusing to ship Google test ad IDs to real users.`,
    );
  }
  console.warn(
    `[app.config] ${name} is not set; using Google test ad ID for local dev only.`,
  );
  return testId;
}

// Real Android ID lives in EAS production env (see
// scripts/apply-admob-production.js); verified present 2026-11-05.
const admobAndroidAppId = admobAppId(
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "ca-app-pub-3940256099942544~3347511713",
);
// iOS is not registered in AdMob yet (no production ID exists and none is
// in EAS env), so a missing iOS ID only warns even on production builds.
// Register com.trivense.app in AdMob, then set EXPO_PUBLIC_ADMOB_IOS_APP_ID.
const admobIosAppId =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ||
  "ca-app-pub-3940256099942544~1458002511";
if (!process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID) {
  console.warn(
    "[app.config] EXPO_PUBLIC_ADMOB_IOS_APP_ID is not set; using Google test ad ID. iOS is not registered in AdMob yet.",
  );
}
// Sentry org "rasoi-app" is correct, not a leftover: it is the shared
// Sentry org (team trivense, project trivense-mobile), per
// scripts/setup-sentry-trivense.js.
const sentryOrg = process.env.SENTRY_ORG || "rasoi-app";
const sentryProject = process.env.SENTRY_PROJECT || "trivense-mobile";

export default {
  expo: {
    name: "Trivense",
    slug: "Trivense",
    version: "1.0.1",
    scheme: "trivense",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.trivense.app",
      googleServicesFile: "./firebase/GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          "Trivense needs camera access to attach receipt photos to expenses.",
        NSPhotoLibraryUsageDescription:
          "Trivense needs photo library access to attach receipt images to expenses.",
        NSPhotoLibraryAddUsageDescription:
          "Trivense can save exported expense files to your photo library.",
        NSLocationWhenInUseUsageDescription:
          "Trivense uses your location to improve travel boards and local currency defaults.",
        LSApplicationQueriesSchemes: ["upi", "tez", "gpay", "phonepe", "whatsapp"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive_icon.png",
        backgroundColor: "#003D66",
      },
      softwareKeyboardLayoutMode: "resize",
      package: "com.trivense.app",
      googleServicesFile: "./firebase/google-services.json",
      permissions: [
        "INTERNET",
        "POST_NOTIFICATIONS",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
      ],
    },
    web: {
      favicon: "./assets/icon.png",
    },
    owner: "takeyshi",
    plugins: [
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/Inter_Bold.ttf",
            "./assets/fonts/Inter_Medium.ttf",
            "./assets/fonts/Inter_Regular.ttf",
            "./assets/fonts/Manrope-Bold.ttf",
            "./assets/fonts/Manrope-Medium.ttf",
            "./assets/fonts/Poppins-Bold.ttf",
            "./assets/fonts/Poppins-Medium.ttf",
            "./assets/fonts/Poppins-Light.ttf",
            "./assets/fonts/Poppins-ExtraLight.ttf",
            "./assets/fonts/Poppins-Regular.ttf",
            "./assets/fonts/Poppins-SemiBold.ttf",
            "./assets/fonts/Poppins-Thin.ttf",
            "./assets/fonts/Poppins-ExtraBold.ttf",
          ],
        },
      ],
      "expo-asset",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#003D66",
          image: "./assets/splash_icon.png",
          dark: {
            image: "./assets/splash_icon.png",
            backgroundColor: "#003D66",
          },
          imageWidth: 220,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#003D66",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Trivense uses your location to improve travel boards and local currency defaults.",
        },
      ],
      "@react-native-community/datetimepicker",
      "expo-web-browser",
      // Bare plugin uses Firebase googleServicesFile path (copies plist + URL scheme).
      // Passing iosUrlScheme options skips Firebase wiring and breaks iOS Google Sign-In.
      "@react-native-google-signin/google-signin",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Trivense needs photo library access to attach receipt images to expenses.",
          cameraPermission:
            "Trivense needs camera access to attach receipt photos to expenses.",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: admobAndroidAppId,
          iosAppId: admobIosAppId,
        },
      ],
      ...(process.env.EXPO_PUBLIC_SENTRY_DSN
        ? [
            [
              "@sentry/react-native/expo",
              {
                organization: sentryOrg,
                project: sentryProject,
              },
            ],
          ]
        : []),
    ],
    extra: {
      eas: {
        projectId: "373dac47-60b0-4de3-8dfc-aea74ec58784",
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
