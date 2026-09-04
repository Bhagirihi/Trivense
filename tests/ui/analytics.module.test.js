import React from "react";
import { waitFor } from "@testing-library/react-native";
import { AnalyticsScreen } from "../../src/screens/AnalyticsScreen";
import {
  createMockSubscription,
  mockNavigation,
  renderWithProviders,
} from "../helpers/renderWithProviders";

describe("Analytics module UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders analytics screen with period selector", async () => {
    const sub = createMockSubscription();
    const { getAllByText } = renderWithProviders(
      <AnalyticsScreen navigation={mockNavigation} />,
      { subscription: sub }
    );
    await waitFor(() => {
      expect(getAllByText("Analytics").length).toBeGreaterThan(0);
    });
  });

  it("shows this week period for free users", async () => {
    const sub = createMockSubscription({
      canUseAnalyticsPeriod: jest.fn((p) => p === "week"),
    });
    const { getAllByText } = renderWithProviders(
      <AnalyticsScreen navigation={mockNavigation} />,
      { subscription: sub }
    );
    await waitFor(() => {
      expect(getAllByText("This Week").length).toBeGreaterThan(0);
    });
  });

  it("loads expense statistics after fetch", async () => {
    const sub = createMockSubscription();
    const { getByText } = renderWithProviders(
      <AnalyticsScreen navigation={mockNavigation} />,
      { subscription: sub }
    );
    await waitFor(() => {
      expect(getByText("Total spent")).toBeTruthy();
    });
  });
});
