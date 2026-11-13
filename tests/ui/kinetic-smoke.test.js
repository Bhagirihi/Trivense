/**
 * Render smoke test for the Kinetic redesign.
 * Verifies the three flagship rebuilt screens mount without crashing under
 * the standard mocked providers/services.
 */
import React from "react";
import { waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { DashboardScreen } from "../../src/screens/DashboardScreen";
import { AnalysisScreen } from "../../src/screens/AnalysisScreen";
import LoginScreen from "../../src/screens/LoginScreen";
import {
  mockNavigation,
  renderWithProviders,
} from "../helpers/renderWithProviders";

describe("Kinetic redesign render smoke", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Dashboard mounts and shows its header", async () => {
    // Dashboard uses useFocusEffect, so it needs a real NavigationContainer
    // (in the app it always renders inside the stack/tabs navigator).
    const { getByText, toJSON } = renderWithProviders(
      <NavigationContainer>
        <DashboardScreen navigation={mockNavigation} />
      </NavigationContainer>
    );
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
    // Navy header carries the Dashboard label (wordmark + label).
    expect(getByText("Dashboard")).toBeTruthy();
  });

  it("Analysis mounts without crashing", async () => {
    const { toJSON } = renderWithProviders(
      <AnalysisScreen navigation={mockNavigation} route={{ params: {} }} />
    );
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
  });

  it("Login mounts and shows the sign-in CTA", async () => {
    const { getByText, toJSON } = renderWithProviders(
      <LoginScreen navigation={mockNavigation} />
    );
    await waitFor(() => {
      expect(toJSON()).toBeTruthy();
    });
    expect(getByText("Sign in")).toBeTruthy();
  });
});
