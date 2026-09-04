import React, { useState, useEffect, useCallback } from "react";
import { shadowStyle } from "../utils/platformStyles";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { CategoryList } from "../components/CategoryList";
import ExpenseList from "../components/ExpenseList";
import { expenseService } from "../services/expenseService";
import { showToast } from "../utils/toast";
import { formatCurrency } from "../utils/formatters";
import { realTimeSync } from "../services/realTimeSync";
import {
  sendExpenseDeletedNotification,
  sendExpenseOverBudgetNotification,
} from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";

const calculateMonthlyStats = (expensesData, setMonthlyStats) => {
  const totalExpenses = expensesData.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  setMonthlyStats({
    totalExpenses,
    totalBudget: 2000.0,
    remainingBalance: 2000.0 - totalExpenses,
  });
};

export const ExpenseScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalExpenses: 0,
    totalBudget: 2000.0,
    remainingBalance: 2000.0,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const memoizedCalculateMonthlyStats = useCallback(
    (expensesData) => {
      const totalExpenses = expensesData.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const budgetUsage = (totalExpenses / monthlyStats.totalBudget) * 100;

      // Check budget usage thresholds and send notifications
      if (budgetUsage >= 100) {
        sendExpenseOverBudgetNotification({
          boardName: "Expenses",
          icon: "alert",
          iconColor: "#F44336",
          budgetAmount: monthlyStats.totalBudget,
          expenseAmount: totalExpenses,
        });
      } else if (budgetUsage >= 90) {
        sendExpenseOverBudgetNotification({
          boardName: "Expenses",
          icon: "alert",
          iconColor: "#F44336",
          budgetAmount: monthlyStats.totalBudget,
          expenseAmount: totalExpenses,
        });
      } else if (budgetUsage >= 70) {
        sendExpenseOverBudgetNotification({
          boardName: "Expenses",
          icon: "alert",
          iconColor: "#FF9800",
          budgetAmount: monthlyStats.totalBudget,
          expenseAmount: totalExpenses,
        });
      } else if (budgetUsage >= 50) {
        sendExpenseOverBudgetNotification({
          boardName: "Expenses",
          icon: "alert",
          iconColor: "#FFC107",
          budgetAmount: monthlyStats.totalBudget,
          expenseAmount: totalExpenses,
        });
      }

      calculateMonthlyStats(expensesData, setMonthlyStats);
    },
    [monthlyStats.totalBudget]
  );

  useEffect(() => {
    fetchExpenses(1);
    const EnpenseRealTimeSync = realTimeSync.subscribeToExpense(
      () => fetchExpenses(1),
      "realtime-expenses-list"
    );
    return () => {
      if (EnpenseRealTimeSync && typeof EnpenseRealTimeSync === "function") {
        EnpenseRealTimeSync();
      }
    };
  }, [selectedCategory]);

  const fetchExpenses = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching expenses...");

      const { data, hasMore: more } = await expenseService.getExpenses(
        selectedCategory === 0 ? null : selectedCategory,
        pageNum,
        10
      );

      if (!data || data.length === 0) {
        setExpenses([]);
        memoizedCalculateMonthlyStats([]);
        setHasMore(false);
        setPage(1);
        return;
      }

      const newExpenses = pageNum === 1 ? data : [...expenses, ...data];
      setExpenses(newExpenses);
      memoizedCalculateMonthlyStats(newExpenses);
      setHasMore(more);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching expenses:", error.message);
      setError("Failed to fetch expenses. Please try again later.");
      showToast.error("Failed to fetch expenses", "Please try again later");
      setExpenses([]);
      memoizedCalculateMonthlyStats([]);
      setHasMore(false);
      setPage(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExpenses(1);
  };

  const handleExpensePress = (expense) => {
    navigation.navigate("ExpenseDetails", { expense });
  };

  const handleDeletePress = async (expenseId) => {
    try {
      // Find the expense before deleting it
      const expenseToDelete = expenses.find(
        (expense) => expense.id === expenseId
      );
      if (!expenseToDelete) {
        throw new Error("Expense not found");
      }

      // Delete the expense
      await expenseService.deleteExpense(expenseId);

      // Send notification for expense deletion
      await sendExpenseDeletedNotification({
        boardName: expenseToDelete?.board || "Unknown",
        icon: expenseToDelete.icon,
        iconColor: expenseToDelete.color,
        expenseName:
          typeof expenseToDelete.category === "string"
            ? expenseToDelete.category
            : expenseToDelete.category?.name || "Uncategorized",
        expenseAmount: expenseToDelete.amount,
      });

      // Update the UI
      const updatedExpenses = expenses.filter(
        (expense) => expense.id !== expenseId
      );
      setExpenses(updatedExpenses);
      memoizedCalculateMonthlyStats(updatedExpenses);
      showToast.success(
        t("expenseDeletedSuccess"),
        t("expenseDeletedMessage")
      );
    } catch (error) {
      console.error("Error deleting expense:", error);
      showToast.error(t("failedToDeleteExpense"), t("tryAgainLater"));
    }
  };

  const renderAddButton = () => (
    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: "rgba(255,255,255,0.12)" }]}
      onPress={() => navigation.navigate("AddExpense")}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={t("addExpense") || "Add expense"}
    >
      <MaterialCommunityIcons
        name="plus"
        size={24}
        color={theme.headerText || "#FFFFFF"}
      />
    </TouchableOpacity>
  );

  const renderMonthlyStats = () => (
    <View style={[styles.monthlyStats, { backgroundColor: theme.card }]}>
      <View style={styles.statsRow}>
        <View style={styles.statsItem}>
          <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>
            {t("totalExpenses")}
          </Text>
          <Text style={[styles.statsValue, { color: theme.text }]}>
            {formatCurrency(monthlyStats.totalExpenses)}
          </Text>
        </View>
        <View style={[styles.statsItem]}>
          <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>
            {t("remaining")}
          </Text>
          <Text
            style={[
              styles.statsValue,
              {
                color:
                  monthlyStats.remainingBalance >= 0
                    ? theme.success
                    : theme.error,
              },
            ]}
          >
            {formatCurrency(monthlyStats.remainingBalance)}
          </Text>
        </View>
      </View>

      {/* Combined Progress Bar */}
      <View style={styles.combinedProgressContainer}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {t("budgetUsage")}
          </Text>

          <View style={styles.progressLegend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: theme.primary }]}
              />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                {t("used")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: theme.success }]}
              />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                {t("remaining")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: theme.success }]}
              />
              <Text
                style={[styles.progressLabel, { color: theme.textSecondary }]}
              >
                {`${Math.round(
                  (monthlyStats.totalExpenses / monthlyStats.totalBudget) * 100
                )}%`}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.combinedProgressBar,
            { backgroundColor: theme.background },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(
                  (monthlyStats.totalExpenses / monthlyStats.totalBudget) * 100
                )}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
          <View
            style={[
              styles.remainingFill,
              {
                width: `100%`,
                backgroundColor: theme.success,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={theme.error}
      />
      <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.primary }]}
        onPress={() => fetchExpenses(1)}
      >
        <Text style={[styles.retryButtonText, { color: theme.white }]}>
          {t("retry")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <ScreenLayout
        header={
          <Header
            title={t("expenses")}
            onBack={() => navigation.goBack()}
            rightComponent={renderAddButton()}
          />
        }
      >
        <AnimatedLoader context="expenses" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      header={
        <Header
          title={t("expenses")}
          onBack={() => navigation.goBack()}
          rightComponent={renderAddButton()}
        />
      }
    >
      <View style={{ marginTop: 10 }}>{renderMonthlyStats()}</View>
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: theme.card || theme.surface,
        }}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.textSecondary}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("searchExpensesPlaceholder")}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={t("searchExpenses")}
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 8,
            color: theme.text,
          }}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
          />
        }
      >
        <CategoryList
          selectedCategory={selectedCategory}
          onSelectCategory={(categoryId) => setSelectedCategory(categoryId)}
          showLabel={true}
        />

        {error ? (
          renderErrorState()
        ) : (
          <ExpenseList
            expenses={
              searchQuery.trim()
                ? expenses.filter((e) =>
                    String(e.description || "")
                      .toLowerCase()
                      .includes(searchQuery.trim().toLowerCase())
                  )
                : expenses
            }
            onExpensePress={handleExpensePress}
            onDeletePress={handleDeletePress}
            onSeeAllPress={() => {}}
            showHeader={true}
            showEmptyState={true}
            showAllButton={false}
            navigation={navigation}
            title={t("transactions")}
            embedded={true}
            showInlineAds={true}
            inlineAdMode="interval"
          />
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  monthlyStats: {
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginBottom: Platform.OS == "ios" ? 10 : 6,
    padding: Platform.OS == "ios" ? 16 : 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    ...shadowStyle(3),
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Platform.OS == "ios" ? 16 : 12,
  },
  statsItem: {
    flex: 1,
    alignItems: "center",
  },
  statsLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  statsValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  combinedProgressContainer: {
    width: "100%",
    marginTop: Platform.OS == "ios" ? 8 : 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  combinedProgressBar: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  remainingFill: {
    height: "100%",
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  progressLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
    textAlign: "center",
  },
  addExpenseButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addExpenseText: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
