import React from "react";
import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../../src/context/ThemeContext";
import { AppSettingsProvider } from "../../src/context/AppSettingsContext";
import { PLANS } from "../../src/config/subscriptionPlans";

export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function TestProviders({ children }) {
  return (
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <ThemeProvider>
        <AppSettingsProvider>{children}</AppSettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export function createMockSubscription(overrides = {}) {
  const isPaidSubscriber = overrides.isPaidSubscriber ?? overrides.isPremium ?? false;
  return {
    plan: PLANS.FREE,
    isPremium: isPaidSubscriber,
    isPaidSubscriber,
    isAdFree: isPaidSubscriber,
    loading: false,
    purchasing: false,
    restoring: false,
    paymentsEnabled: true,
    purchasesConfigured: true,
    offeringsLoading: false,
    hasFeature: jest.fn(() => false),
    requireFeature: jest.fn(),
    canUseAnalyticsPeriod: jest.fn((period) => period === "week"),
    purchasePlan: jest.fn().mockResolvedValue(undefined),
    restorePurchases: jest.fn().mockResolvedValue({ isPremium: false }),
    refreshSubscription: jest.fn().mockResolvedValue(undefined),
    getPlanPriceLabel: jest.fn((planId) =>
      planId === PLANS.MONTHLY ? "₹299" : "₹2,499"
    ),
    getPlanMonthlyPriceLabel: jest.fn(() => "₹208"),
    ...overrides,
  };
}

export function applySubscriptionMock(overrides = {}) {
  Object.assign(global.__subscriptionMock__, createMockSubscription(overrides));
  jest.clearAllMocks();
  Object.assign(global.__subscriptionMock__, createMockSubscription(overrides));
}

export function applyAuthMock(overrides = {}) {
  Object.assign(global.__authMock__, {
    session: { user: { id: "user-1", email: "test@trivense.app" } },
    user: { id: "user-1", email: "test@trivense.app" },
    loading: false,
    ...overrides,
  });
}

export function renderWithProviders(ui, { subscription } = {}) {
  if (subscription) applySubscriptionMock(subscription);
  else applySubscriptionMock();
  applyAuthMock();

  return render(<TestProviders>{ui}</TestProviders>);
}

export function renderWithTheme(ui) {
  return render(<TestProviders>{ui}</TestProviders>);
}
