import "@testing-library/jest-native/extend-expect";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock("react-native-worklets", () => ({}));

jest.mock("react-native-google-mobile-ads", () => ({
  TestIds: {
    ADAPTIVE_BANNER: "test-banner",
    INTERSTITIAL: "test-interstitial",
    APP_OPEN: "test-app-open",
  },
  BannerAd: "BannerAd",
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER" },
  AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
  InterstitialAd: {
    createForAdRequest: () => ({
      addAdEventListener: jest.fn(),
      load: jest.fn(),
      show: jest.fn(),
    }),
  },
  AppOpenAd: {
    createForAdRequest: () => ({
      addAdEventListener: jest.fn(),
      load: jest.fn(),
      show: jest.fn(),
    }),
  },
  default: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("react-native-purchases", () => ({
  LOG_LEVEL: { DEBUG: "DEBUG" },
  default: {
    configure: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    getOfferings: jest.fn().mockResolvedValue({ current: null }),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  },
}));

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  return {
    LinearGradient: ({ children }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock("@react-native-clipboard/clipboard", () => ({
  setString: jest.fn(),
  getString: jest.fn().mockResolvedValue(""),
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
}));

jest.mock("expo-font", () => ({
  useFonts: () => [true],
  isLoaded: () => true,
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
  setOptions: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "test-token" }),
}));

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue(null),
  getCurrentPositionAsync: jest.fn().mockResolvedValue(null),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([]),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  Accuracy: { Low: 1 },
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (c) => c,
}));

jest.mock("../src/utils/toast", () => ({
  showToast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
  },
  isSuccessResponse: jest.fn(() => false),
  isCancelledResponse: jest.fn(() => false),
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
}));

jest.mock("../src/services/googleAuthService", () => ({
  getGoogleWebClientId: jest.fn(() => "test-web-client"),
  getGoogleIosClientId: jest.fn(() => "test-ios-client"),
  isRnGoogleSignInLinked: jest.fn(() => false),
  isNativeGoogleSignInAvailable: jest.fn(() => false),
  getGoogleIdTokenNative: jest.fn().mockResolvedValue({
    idToken: null,
    error: new Error("Native Google Sign-In unavailable in tests"),
  }),
  signInWithGoogleNative: jest.fn().mockResolvedValue({
    data: null,
    error: new Error("Native Google Sign-In unavailable in tests"),
  }),
}));

jest.mock("../src/config/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
  getSession: jest.fn().mockResolvedValue({ session: null }),
  signInWithGoogle: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
  signUpWithEmail: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
  getUserProfile: jest.fn().mockResolvedValue({ data: {}, error: null }),
}));

jest.mock("../src/services/analyticsService", () => ({
  fetchExpenseTrends: jest.fn().mockResolvedValue({
    statistics: {
      totalAmount: 1000,
      averageAmount: 100,
      averageAmountPerDay: 100,
      highestAmount: 500,
      lowestAmount: 10,
      totalCount: 10,
      categoryBreakdown: [
        {
          name: "Food",
          percentage: 40,
          amount: 400,
          count: 4,
          icon: "food",
          color: "#003D66",
        },
      ],
      previousPeriod: { percentageChange: 5 },
    },
    insights: [],
  }),
}));

jest.mock("../src/services/expenseBoardService", () => ({
  expenseBoardService: {
    getSharedMembers: jest.fn().mockResolvedValue([]),
    getBoardCount: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock("../src/services/supabaseService", () => ({
  userService: {
    getProfile: jest.fn().mockResolvedValue({
      profile: {
        id: "user-1",
        default_board_budget: 5000,
        referral_code: "TRIV123",
        board_id: "board-1",
      },
    }),
    updateProfile: jest.fn(),
  },
}));

jest.mock("../src/services/exportService", () => ({
  exportAndShare: jest.fn(),
}));

jest.mock("../src/services/googleDriveService", () => ({
  isGoogleDriveConfigured: jest.fn(() => false),
  backupExportToGoogleDrive: jest.fn(),
}));

jest.mock("../src/services/realTimeSync", () => ({
  realTimeSync: jest.fn(() => jest.fn()),
}));

jest.mock("../src/hooks/useFooterScrollPadding", () => ({
  useFooterScrollPadding: () => 80,
}));

jest.mock("../src/services/referralService", () => ({
  referralService: {
    getMyReferrals: jest.fn().mockResolvedValue([]),
    applyReferralCode: jest.fn().mockResolvedValue({ data: null, error: null }),
    applyPendingReferralForUser: jest.fn().mockResolvedValue({ data: null, error: null, skipped: true }),
  },
}));

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useRoute: jest.fn(() => ({ params: {} })),
    useNavigation: () => global.__navigationMock__,
  };
});

global.__navigationMock__ = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock("../src/hooks/useFeatureLockModal", () => ({
  useFeatureLockModal: () => ({
    openFeatureLock: jest.fn(),
    featureLockModal: null,
  }),
}));

jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => global.__authMock__,
  AuthProvider: ({ children }) => children,
}));

jest.mock("../src/context/SubscriptionContext", () => ({
  useSubscription: () => global.__subscriptionMock__,
  SubscriptionProvider: ({ children }) => children,
}));

global.__authMock__ = {
  session: { user: { id: "user-1", email: "test@trivense.app" } },
  user: { id: "user-1", email: "test@trivense.app" },
  loading: false,
};

global.__subscriptionMock__ = {
  plan: "free",
  isPremium: false,
  isPaidSubscriber: false,
  isAdFree: false,
  paymentsEnabled: true,
  loading: false,
  purchasing: false,
  restoring: false,
  purchasesConfigured: true,
  offeringsLoading: false,
  hasFeature: jest.fn(() => false),
  requireFeature: jest.fn(),
  canUseAnalyticsPeriod: jest.fn((period) => period === "week"),
  purchasePlan: jest.fn().mockResolvedValue(undefined),
  restorePurchases: jest.fn().mockResolvedValue({ isPremium: false }),
  refreshSubscription: jest.fn().mockResolvedValue(undefined),
  getPlanPriceLabel: jest.fn(() => "₹299"),
  getPlanMonthlyPriceLabel: jest.fn(() => "₹208"),
};

global.alert = jest.fn();
