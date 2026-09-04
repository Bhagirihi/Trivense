import React from "react";
import { fireEvent, screen } from "@testing-library/react-native";
import { LoginScreen } from "../../src/screens/LoginScreen";
import { mockNavigation, renderWithTheme } from "../helpers/renderWithProviders";

describe("LoginScreen UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders welcome copy and primary actions", () => {
    renderWithTheme(<LoginScreen navigation={mockNavigation} />);

    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByText("Split expenses, made easy.")).toBeTruthy();
    expect(screen.getByText("Sign in")).toBeTruthy();
    expect(screen.getByText("Continue with Google")).toBeTruthy();
    expect(screen.getByText("Create account")).toBeTruthy();
  });

  it("shows validation errors when signing in with empty fields", () => {
    renderWithTheme(<LoginScreen navigation={mockNavigation} />);

    fireEvent.press(screen.getByText("Sign in"));

    expect(screen.getByText("Email is required")).toBeTruthy();
    expect(screen.getByText("Password is required")).toBeTruthy();
  });

  it("navigates to register and forgot password", () => {
    renderWithTheme(<LoginScreen navigation={mockNavigation} />);

    fireEvent.press(screen.getByText("Create account"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Register");

    fireEvent.press(screen.getByText("Forgot password?"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ForgotPassword");
  });
});
