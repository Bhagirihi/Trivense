import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { PaywallScreen } from "../../src/screens/PaywallScreen";
import { PLANS } from "../../src/config/subscriptionPlans";
import {
  createMockSubscription,
  mockNavigation,
  renderWithProviders,
} from "../helpers/renderWithProviders";

describe("Paywall module UI", () => {
  const route = { params: {} };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders premium title and plan options", () => {
    const sub = createMockSubscription();
    const { getByText } = renderWithProviders(
      <PaywallScreen navigation={mockNavigation} route={route} />,
      { subscription: sub }
    );
    expect(getByText("Unlock Trivense Premium")).toBeTruthy();
    expect(getByText("Monthly")).toBeTruthy();
    expect(getByText("Yearly")).toBeTruthy();
    expect(getByText("Premium includes")).toBeTruthy();
  });

  it("shows locked feature message when feature param passed", () => {
    const sub = createMockSubscription();
    const lockedRoute = { params: { feature: "board_sharing" } };
    const { getAllByText } = renderWithProviders(
      <PaywallScreen navigation={mockNavigation} route={lockedRoute} />,
      { subscription: sub }
    );
    expect(getAllByText("Share boards with others").length).toBeGreaterThan(0);
  });

  it("allows selecting yearly plan", () => {
    const sub = createMockSubscription();
    const { getByText } = renderWithProviders(
      <PaywallScreen navigation={mockNavigation} route={route} />,
      { subscription: sub }
    );
    fireEvent.press(getByText("Yearly"));
    expect(getByText("Best value")).toBeTruthy();
  });

  it("calls purchasePlan on subscribe", async () => {
    const purchasePlan = jest.fn().mockResolvedValue(undefined);
    const sub = createMockSubscription({ purchasePlan });
    const { getByText } = renderWithProviders(
      <PaywallScreen navigation={mockNavigation} route={route} />,
      { subscription: sub }
    );
    fireEvent.press(getByText(/Subscribe —/));
    await waitFor(() => {
      expect(global.__subscriptionMock__.purchasePlan).toHaveBeenCalled();
    });
  });

  it("shows privacy policy link", () => {
    const sub = createMockSubscription();
    const { getByText } = renderWithProviders(
      <PaywallScreen navigation={mockNavigation} route={route} />,
      { subscription: sub }
    );
    expect(getByText("Privacy Policy")).toBeTruthy();
  });
});
