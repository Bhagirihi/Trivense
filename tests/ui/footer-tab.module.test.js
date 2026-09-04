import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import FooterTab from "../../src/components/FooterTab";
import { mockNavigation, renderWithTheme } from "../helpers/renderWithProviders";

describe("FooterTab UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

    it("renders four tabs with labels", () => {
      renderWithTheme(
        <FooterTab navigation={mockNavigation} activeRoute="Home" />
      );

      expect(screen.getByText("Home")).toBeTruthy();
      expect(screen.getByText("Analytics")).toBeTruthy();
      expect(screen.getByText("Profile")).toBeTruthy();
      expect(screen.getByText("Settings")).toBeTruthy();
    });

  it("navigates when a tab is pressed", () => {
    renderWithTheme(
      <FooterTab navigation={mockNavigation} activeRoute="Home" />
    );

    fireEvent.press(screen.getByTestId("footer-tab-Analytics"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Analytics");

    fireEvent.press(screen.getByTestId("footer-tab-Settings"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Settings");
  });
});
