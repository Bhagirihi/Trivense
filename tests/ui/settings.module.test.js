import React from "react";
import { waitFor } from "@testing-library/react-native";
import { SettingsScreen } from "../../src/screens/SettingsScreen";
import { userService } from "../../src/services/supabaseService";
import { expenseBoardService } from "../../src/services/expenseBoardService";
import { supabase } from "../../src/config/supabase";
import {
  createMockSubscription,
  mockNavigation,
  renderWithProviders,
} from "../helpers/renderWithProviders";

describe("Settings module UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    });
    const boardsChain = {
      select: jest.fn().mockResolvedValue({
        data: [{ id: "board-1", name: "Personal", is_default: true }],
        error: null,
      }),
    };
    supabase.from.mockImplementation((table) => {
      if (table === "expense_boards") return boardsChain;
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
    });
  });

  it("renders settings title and sections", async () => {
    const sub = createMockSubscription();
    const { getByText, getAllByText } = renderWithProviders(
      <SettingsScreen navigation={mockNavigation} />,
      { subscription: sub }
    );
    await waitFor(() => {
      expect(getAllByText("Settings").length).toBeGreaterThan(0);
    });
    expect(getByText("Appearance")).toBeTruthy();
    expect(getByText("Expense Settings")).toBeTruthy();
    expect(getByText("Default Board")).toBeTruthy();
  });

  it("shows premium access row for free users", async () => {
    const sub = createMockSubscription({ isPremium: false });
    const { getByText } = renderWithProviders(
      <SettingsScreen navigation={mockNavigation} />,
      { subscription: sub }
    );
    await waitFor(() => {
      expect(getByText("Premium Access")).toBeTruthy();
    });
  });

  it("loads profile and boards on mount", async () => {
    const sub = createMockSubscription();
    renderWithProviders(
      <SettingsScreen navigation={mockNavigation} />,
      { subscription: sub }
    );
    await waitFor(() => {
      expect(userService.getProfile).toHaveBeenCalled();
      expect(expenseBoardService.getSharedMembers).toHaveBeenCalled();
    });
  });
});
