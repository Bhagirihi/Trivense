import React from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "../../src/screens/LoginScreen";
import RegisterScreen from "../../src/screens/RegisterScreen";
import ForgotPasswordScreen from "../../src/screens/ForgotPasswordScreen";
import { supabase } from "../../src/config/supabase";
import { showToast } from "../../src/utils/toast";
import {
  mockNavigation,
  renderWithTheme,
} from "../helpers/renderWithProviders";

describe("Auth module UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("LoginScreen", () => {
    it("renders welcome, email, password, and sign in", () => {
      const { getByText, getByPlaceholderText } = renderWithTheme(
        <LoginScreen navigation={mockNavigation} />
      );
      expect(getByText("Welcome back")).toBeTruthy();
      expect(getByText("Split expenses, made easy.")).toBeTruthy();
      expect(getByPlaceholderText("you@example.com")).toBeTruthy();
      expect(getByPlaceholderText("Your password")).toBeTruthy();
      expect(getByText("Sign in")).toBeTruthy();
    });

    it("shows validation errors for empty submit", () => {
      const { getByText } = renderWithTheme(
        <LoginScreen navigation={mockNavigation} />
      );
      fireEvent.press(getByText("Sign in"));
      expect(getByText("Email is required")).toBeTruthy();
      expect(getByText("Password is required")).toBeTruthy();
    });

    it("navigates to Register from footer link", () => {
      const { getByText } = renderWithTheme(
        <LoginScreen navigation={mockNavigation} />
      );
      fireEvent.press(getByText("Create account"));
      expect(mockNavigation.navigate).toHaveBeenCalledWith("Register");
    });

    it("navigates to ForgotPassword", () => {
      const { getByText } = renderWithTheme(
        <LoginScreen navigation={mockNavigation} />
      );
      fireEvent.press(getByText("Forgot password?"));
      expect(mockNavigation.navigate).toHaveBeenCalledWith("ForgotPassword");
    });

    it("calls supabase signIn with valid credentials", async () => {
      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { email_confirmed_at: "2025-01-01" } },
        error: null,
      });
      const { getByText, getByPlaceholderText } = renderWithTheme(
        <LoginScreen navigation={mockNavigation} />
      );
      fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@trivense.app");
      fireEvent.changeText(getByPlaceholderText("Your password"), "password123");
      fireEvent.press(getByText("Sign in"));
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "user@trivense.app",
          password: "password123",
        });
      });
    });
  });

  describe("RegisterScreen", () => {
    it("renders registration form fields", () => {
      const { getByPlaceholderText, getAllByText } = renderWithTheme(
        <RegisterScreen navigation={mockNavigation} />
      );
      expect(getByPlaceholderText("Your full name")).toBeTruthy();
      expect(getByPlaceholderText("you@example.com")).toBeTruthy();
    });

    it("validates required fields on submit", () => {
      const { getAllByText, getByText } = renderWithTheme(
        <RegisterScreen navigation={mockNavigation} />
      );
      fireEvent.press(getAllByText("Create account")[1]);
      expect(getByText("Full name is required")).toBeTruthy();
      expect(getByText("Email is required")).toBeTruthy();
    });

    it("navigates back to Login", () => {
      const { getByText } = renderWithTheme(
        <RegisterScreen navigation={mockNavigation} />
      );
      fireEvent.press(getByText("Sign in"));
      expect(mockNavigation.navigate).toHaveBeenCalledWith("Login");
    });
  });

  describe("ForgotPasswordScreen", () => {
    it("renders reset password UI", () => {
      const { getByText, getByPlaceholderText } = renderWithTheme(
        <ForgotPasswordScreen navigation={mockNavigation} />
      );
      expect(getByText("Reset password")).toBeTruthy();
      expect(getByPlaceholderText("you@example.com")).toBeTruthy();
      expect(getByText("Send reset link")).toBeTruthy();
    });

    it("shows email validation error", () => {
      const { getByText } = renderWithTheme(
        <ForgotPasswordScreen navigation={mockNavigation} />
      );
      fireEvent.press(getByText("Send reset link"));
      expect(getByText("Email is required")).toBeTruthy();
    });

    it("sends reset email and navigates to Login", async () => {
      const { getByText, getByPlaceholderText } = renderWithTheme(
        <ForgotPasswordScreen navigation={mockNavigation} />
      );
      fireEvent.changeText(getByPlaceholderText("you@example.com"), "user@trivense.app");
      fireEvent.press(getByText("Send reset link"));
      await waitFor(() => {
        expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled();
        expect(showToast.success).toHaveBeenCalled();
        expect(mockNavigation.navigate).toHaveBeenCalledWith("Login");
      });
    });
  });
});
