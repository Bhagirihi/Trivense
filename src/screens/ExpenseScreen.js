import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
} from "react-native";
import { devLog } from "../utils/logger";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { CategoryList } from "../components/CategoryList";
import ExpenseItem from "../components/ExpenseItem";
import InlineListAd from "../components/InlineListAd";
import { expenseService } from "../services/expenseService";
import { expenseBoardService } from "../services/expenseBoardService";
import { showToast } from "../utils/toast";
import { formatCurrency } from "../utils/formatters";
import { realTimeSync } from "../services/realTimeSync";
import {
  sendExpenseDeletedNotification,
  sendExpenseOverBudgetNotification,
} from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useAdPolicy } from "../context/AdPolicyContext";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { kinetic } from "../theme/tokens";

const K = kinetic.colors;

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

const FILTERS = ["all", "youPaid", "youOwe", "settled", "pending"];

const filterLabel = (filter) =>
  ({
    all: "All",
    youPaid: "You Paid",
    youOwe: "You Owe",
    settled: "Settled",
    pending: "Pending",
  })[filter] || filter;

const dayLabel = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const dayKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

export const ExpenseScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { showBannerAds } = useAdPolicy();
  const { isAdFree } = useAdEntitlement();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  // Latest expenses for paginated fetches: fetchExpenses is memoized, so
  // it reads the list through a ref instead of closing over state.
  const expensesRef = useRef([]);
  expensesRef.current = expenses;
  const [monthlyStats, setMonthlyStats] = useState({
    totalExpenses: 0,
    totalBudget: 2000.0,
    remainingBalance: 2000.0,
  });
  const [, setPage] = useState(1);
  const [, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Board id -> true when the board has outstanding (greedy) settlements.
  // "Settled"/"Pending" are board-level: the app stores no per-expense
  // settled flag, so an expense shares its board's settlement status.
  const [boardHasOutstanding, setBoardHasOutstanding] = useState({});
  const [owedToYou, setOwedToYou] = useState(0);
  const [youOwe, setYouOwe] = useState(0);

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

  // Live board settlement status for the status filters + owed/owe totals.
  const fetchBoardSettlements = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const list = await expenseBoardService.getExpenseBoards();
      const entries = await Promise.allSettled(
        (list || []).map(async (board) => {
          const details = await expenseBoardService.getExpenseBoardsByID(
            board.id
          );
          return [board.id, details];
        })
      );
      const outstanding = {};
      let owed = 0;
      let owe = 0;
      entries.forEach((entry) => {
        if (entry.status !== "fulfilled") return;
        const [boardId, details] = entry.value;
        if (!details || Array.isArray(details)) return;
        const settlements = details.settlements || [];
        outstanding[boardId] = settlements.length > 0;
        settlements.forEach((settlement) => {
          if (settlement.toId === authUser.id) owed += Number(settlement.amount) || 0;
          else if (settlement.fromId === authUser.id) owe += Number(settlement.amount) || 0;
        });
      });
      setBoardHasOutstanding(outstanding);
      setOwedToYou(owed);
      setYouOwe(owe);
    } catch (error) {
      console.error("Error fetching board settlements:", error);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchExpenses(1);
    fetchBoardSettlements();
    const EnpenseRealTimeSync = realTimeSync.subscribeToExpense(
      () => fetchExpenses(1),
      "realtime-expenses-list"
    );
    return () => {
      if (EnpenseRealTimeSync && typeof EnpenseRealTimeSync === "function") {
        EnpenseRealTimeSync();
      }
    };
  }, [selectedCategory, fetchExpenses, fetchBoardSettlements]);

  const fetchExpenses = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      devLog("Fetching expenses...");

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

      const newExpenses =
        pageNum === 1 ? data : [...expensesRef.current, ...data];
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
  }, [selectedCategory, memoizedCalculateMonthlyStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExpenses(1);
    fetchBoardSettlements();
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

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (
        query &&
        !String(expense.description || "").toLowerCase().includes(query)
      ) {
        return false;
      }
      if (statusFilter === "youPaid") return expense.created_by === authUser?.id;
      if (statusFilter === "youOwe") return expense.created_by !== authUser?.id;
      if (statusFilter === "settled") {
        return boardHasOutstanding[expense.board_id] === false;
      }
      if (statusFilter === "pending") {
        return boardHasOutstanding[expense.board_id] !== false;
      }
      return true;
    });
  }, [expenses, searchQuery, statusFilter, authUser?.id, boardHasOutstanding]);

  // Group the filtered rows by day (newest first) for the date sections.
  const groupedExpenses = useMemo(() => {
    const groups = new Map();
    filteredExpenses.forEach((expense) => {
      const key = dayKey(expense.date || expense.created_at);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: dayLabel(expense.date || expense.created_at),
          total: 0,
          items: [],
        });
      }
      const group = groups.get(key);
      group.items.push(expense);
      group.total += Number(expense.amount) || 0;
    });
    return [...groups.values()];
  }, [filteredExpenses]);

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

  const renderMonthlyStats = () => {
    const usagePct = Math.round(
      (monthlyStats.totalExpenses / monthlyStats.totalBudget) * 100
    );
    return (
      <View style={styles.monthlyStats}>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <Text style={styles.statsLabel}>Total Spend</Text>
            <Text style={styles.statsValue}>
              {formatCurrency(monthlyStats.totalExpenses)}
            </Text>
          </View>
          <View style={styles.statsItem}>
            <Text style={styles.statsLabel}>{t("remaining")}</Text>
            <Text
              style={[
                styles.statsValue,
                {
                  color:
                    monthlyStats.remainingBalance >= 0 ? "#7FFC97" : "#FFB690",
                },
              ]}
            >
              {formatCurrency(monthlyStats.remainingBalance)}
            </Text>
          </View>
        </View>
        <View style={styles.owedRow}>
          <View style={styles.owedChip}>
            <Text style={styles.owedChipLabel}>YOU ARE OWED</Text>
            <Text style={styles.owedChipValue}>{formatCurrency(owedToYou)}</Text>
          </View>
          <View style={styles.owedChip}>
            <Text style={styles.owedChipLabel}>YOU OWE</Text>
            <Text style={styles.owedChipValue}>{formatCurrency(youOwe)}</Text>
          </View>
        </View>
        <View style={styles.combinedProgressContainer}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>{t("budgetUsage")}</Text>
            <Text style={styles.progressLabel}>{`${usagePct}%`}</Text>
          </View>
          <View style={styles.combinedProgressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, usagePct))}%`,
                  backgroundColor: kinetic.gaugeColor(usagePct),
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {FILTERS.map((filter) => {
        const active = statusFilter === filter;
        return (
          <TouchableOpacity
            key={filter}
            onPress={() => setStatusFilter(filter)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${filterLabel(filter)} filter`}
            style={[
              styles.filterChip,
              active && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {filterLabel(filter)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
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

  const renderGroupedList = () => {
    if (filteredExpenses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={48}
            color={K.textTertiary}
          />
          <Text style={styles.emptyText}>
            {searchQuery || statusFilter !== "all"
              ? "No expenses match this filter."
              : "No expenses yet."}
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => navigation.navigate("AddExpense")}
            accessibilityRole="button"
            accessibilityLabel={t("addExpense") || "Add expense"}
          >
            <Text style={styles.emptyCtaText}>
              {t("addExpense") || "Add expense"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    const showAds = showBannerAds && !isAdFree;
    let rowIndex = 0;
    return (
      <View style={styles.groupedList}>
        {groupedExpenses.map((group) => (
          <View key={group.key}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{group.label}</Text>
              <Text style={styles.dateHeaderTotal}>
                Total: {formatCurrency(group.total)}
              </Text>
            </View>
            {group.items.map((expense) => {
              rowIndex += 1;
              const adAfter = showAds && rowIndex % 8 === 0;
              return (
                <React.Fragment key={expense.id}>
                  <ExpenseItem
                    expense={expense}
                    onPress={() => handleExpensePress(expense)}
                    onDelete={() => handleDeletePress(expense.id)}
                  />
                  {adAfter ? (
                    <View style={styles.listAdWrap}>
                      <InlineListAd />
                    </View>
                  ) : null}
                </React.Fragment>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
          />
        }
      >
        <View style={{ marginTop: 10 }}>{renderMonthlyStats()}</View>
        <View style={styles.searchBar}>
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
            style={styles.searchInput}
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
        {renderFilterChips()}
        <CategoryList
          selectedCategory={selectedCategory}
          onSelectCategory={(categoryId) => setSelectedCategory(categoryId)}
          showLabel={true}
        />

        {error ? renderErrorState() : renderGroupedList()}
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddExpense")}
        accessibilityRole="button"
        accessibilityLabel={t("addExpense") || "Add expense"}
        testID="expense-fab-add"
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 96,
  },
  monthlyStats: {
    marginHorizontal: 18,
    marginBottom: Platform.OS === "ios" ? 10 : 6,
    padding: Platform.OS === "ios" ? 16 : 12,
    borderRadius: 20,
    backgroundColor: K.navy,
    ...kinetic.shadows.elevated,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Platform.OS === "ios" ? 16 : 12,
  },
  statsItem: {
    flex: 1,
    alignItems: "center",
  },
  statsLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
  },
  statsValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  owedRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  owedChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: kinetic.radii.md,
    padding: 10,
    alignItems: "center",
  },
  owedChipLabel: {
    ...kinetic.typography.captionBold,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.5,
  },
  owedChipValue: {
    ...kinetic.typography.headingMedium,
    color: "#FFFFFF",
    marginTop: 2,
  },
  combinedProgressContainer: {
    width: "100%",
    marginTop: Platform.OS === "ios" ? 8 : 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  combinedProgressBar: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: K.card,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: K.textPrimary,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: K.borderStrong,
    backgroundColor: K.card,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: K.navy,
    borderColor: K.navy,
  },
  filterChipText: {
    ...kinetic.typography.caption,
    fontWeight: "600",
    color: K.textSecondary,
  },
  filterChipTextActive: {
    color: K.textInverse,
  },
  groupedList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  dateHeaderText: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
  },
  dateHeaderTotal: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
  },
  listAdWrap: {
    marginBottom: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: K.coral,
    alignItems: "center",
    justifyContent: "center",
    ...kinetic.shadows.ctaCoral,
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
    color: K.textSecondary,
  },
  emptyCta: {
    backgroundColor: K.coral,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
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
    minHeight: 48,
    justifyContent: "center",
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
