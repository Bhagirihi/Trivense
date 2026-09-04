import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { expenseService } from "../services/expenseService";
import { showToast } from "../utils/toast";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { sendExpenseDeletedNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";

const paymentMethodLabel = (method) => {
  if (!method) return "—";
  const map = {
    cash: "Cash",
    card: "Card",
    upi: "UPI",
    net_banking: "Net Banking",
  };
  return map[method] || method;
};

export const ExpenseDetailsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { expense: initialExpense, expenseId } = route.params || {};
  const [expense, setExpense] = useState(initialExpense || null);
  const [loading, setLoading] = useState(!initialExpense && !!expenseId);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (initialExpense) {
      setExpense(initialExpense);
      return;
    }
    if (!expenseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await expenseService.getExpenseById(expenseId);
        if (!cancelled) setExpense(data);
      } catch (e) {
        if (!cancelled) {
          showToast.error(t("error") || "Error", e?.message || "Failed to load expense");
          navigation.goBack();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [expenseId, initialExpense, navigation, t]);

  const handleDelete = () => {
    if (!expense?.id) return;
    Alert.alert(
      t("delete") || "Delete",
      t("deleteExpenseConfirm") || "Are you sure you want to delete this expense?",
      [
        { text: t("cancel") || "Cancel", style: "cancel" },
        {
          text: t("delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await expenseService.deleteExpense(expense.id);
              await sendExpenseDeletedNotification({
                boardName: expense.board || "Unknown",
                icon: expense.icon || "receipt",
                iconColor: expense.color || "#6C5CE7",
                expenseName: typeof expense.category === "string" ? expense.category : expense.category?.name || "Expense",
                expenseAmount: expense.amount,
              });
              showToast.success(t("expenseDeletedSuccess") || "Deleted", t("expenseDeletedMessage") || "Expense deleted");
              navigation.goBack();
            } catch (e) {
              showToast.error(t("error") || "Error", e?.message || "Failed to delete");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!expense) return;
    navigation.navigate("AddExpense", {
      expenseId: expense.id,
      expense,
    });
  };

  if (loading) {
    return (
      <ScreenLayout header={<Header title={t("expenseDetails") || "Expense Details"} onBack={() => navigation.goBack()} />}>
        <AnimatedLoader context="expenses" />
      </ScreenLayout>
    );
  }

  if (!expense) {
    return (
      <ScreenLayout header={<Header title={t("expenseDetails") || "Expense Details"} onBack={() => navigation.goBack()} />}>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t("expenseNotFound") || "Expense not found"}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const categoryName = typeof expense.category === "string"
    ? expense.category
    : expense.category?.name || "Uncategorized";
  const iconName = expense.icon || expense.category?.icon || "receipt";
  const iconColor = expense.color || expense.category?.color || theme.primary;

  return (
    <ScreenLayout header={<Header
        title={t("expenseDetails") || "Expense Details"}
        onBack={() => navigation.goBack()}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.iconButton, { backgroundColor: theme.card }]}
            >
              <MaterialCommunityIcons name="pencil" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              style={[styles.iconButton, { backgroundColor: theme.errorLight || "#FFEBEE" }]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <MaterialCommunityIcons name="delete-outline" size={22} color={theme.error} />
              )}
            </TouchableOpacity>
          </View>
        }
      />}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.amountCard, { backgroundColor: theme.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${iconColor}20` }]}>
            <MaterialCommunityIcons
              name={iconName}
              size={40}
              color={iconColor}
            />
          </View>
          <Text style={[styles.amount, { color: theme.text }]}>
            {formatCurrency(expense.amount)}
          </Text>
          <Text style={[styles.categoryBadge, { color: theme.textSecondary }]}>
            {categoryName}
          </Text>
          {expense.description ? (
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {expense.description}
            </Text>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {t("details") || "Details"}
          </Text>
          <DetailRow
            icon="calendar"
            label={t("date") || "Date"}
            value={formatDateTime(expense.date || expense.created_at)}
            theme={theme}
          />
          <DetailRow
            icon="view-dashboard-outline"
            label={t("board") || "Board"}
            value={expense.board || "—"}
            theme={theme}
          />
          <DetailRow
            icon="credit-card-outline"
            label={t("paymentMethod") || "Payment method"}
            value={paymentMethodLabel(expense.payment_method)}
            theme={theme}
          />
          {expense.created_by_profile ? (
            <DetailRow
              icon="account-outline"
              label={t("addedBy") || "Added by"}
              value={expense.created_by_profile.full_name || "—"}
              theme={theme}
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

function DetailRow({ icon, label, value, theme }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.borderLight }]}>
      <MaterialCommunityIcons name={icon} size={20} color={theme.textSecondary} style={styles.detailIcon} />
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  amountCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: {},
    }),
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  amount: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  categoryBadge: {
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  section: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: {},
    }),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 14,
    flex: 0.35,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
    flex: 0.65,
  },
});

export default ExpenseDetailsScreen;
