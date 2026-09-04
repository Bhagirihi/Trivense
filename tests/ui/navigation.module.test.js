import React from "react";
import { fireEvent } from "@testing-library/react-native";
import FooterTab from "../../src/components/FooterTab";
import { ScreenLayout } from "../../src/components/ScreenLayout";
import { Text } from "react-native";
import {
  mockNavigation,
  renderWithProviders,
} from "../helpers/renderWithProviders";

describe("Navigation module UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("FooterTab", () => {
    it("renders Home, Analytics, Profile, and Settings tabs", () => {
      const { getByTestId, getByLabelText } = renderWithProviders(
        <FooterTab navigation={mockNavigation} activeRoute="Home" />
      );
      expect(getByTestId("footer-tab-Home")).toBeTruthy();
      expect(getByTestId("footer-tab-Analytics")).toBeTruthy();
      expect(getByTestId("footer-tab-Profile")).toBeTruthy();
      expect(getByTestId("footer-tab-Settings")).toBeTruthy();
      expect(getByLabelText("Home")).toBeTruthy();
      expect(getByLabelText("Analytics")).toBeTruthy();
      expect(getByLabelText("Profile")).toBeTruthy();
      expect(getByLabelText("Settings")).toBeTruthy();
    });

    it("navigates to Dashboard when Home tab pressed", () => {
      const { getByTestId } = renderWithProviders(
        <FooterTab navigation={mockNavigation} activeRoute="Analytics" />
      );
      fireEvent.press(getByTestId("footer-tab-Home"));
      expect(mockNavigation.navigate).toHaveBeenCalledWith("Dashboard");
    });

    it("navigates to Analytics when Analytics tab pressed", () => {
      const { getByTestId } = renderWithProviders(
        <FooterTab navigation={mockNavigation} activeRoute="Home" />
      );
      fireEvent.press(getByTestId("footer-tab-Analytics"));
      expect(mockNavigation.navigate).toHaveBeenCalledWith("Analytics");
    });

    it("navigates to Settings when Settings tab pressed", () => {
      const { getByTestId } = renderWithProviders(
        <FooterTab navigation={mockNavigation} activeRoute="Home" />
      );
      fireEvent.press(getByTestId("footer-tab-Settings"));
      expect(mockNavigation.navigate).toHaveBeenCalledWith("Settings");
    });
  });

  describe("ScreenLayout", () => {
    it("renders children content", () => {
      const { getByText } = renderWithProviders(
        <ScreenLayout>
          <Text>Screen body</Text>
        </ScreenLayout>
      );
      expect(getByText("Screen body")).toBeTruthy();
    });

    it("renders header when provided", () => {
      const { getByText } = renderWithProviders(
        <ScreenLayout header={<Text>Header title</Text>}>
          <Text>Body</Text>
        </ScreenLayout>
      );
      expect(getByText("Header title")).toBeTruthy();
    });

    it("renders footer tabs when footerRoute set", () => {
      const { getByTestId } = renderWithProviders(
        <ScreenLayout navigation={mockNavigation} footerRoute="Home">
          <Text>Dashboard content</Text>
        </ScreenLayout>
      );
      expect(getByTestId("footer-tab-Home")).toBeTruthy();
    });
  });
});
