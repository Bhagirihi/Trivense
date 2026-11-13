import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { expenseService } from "../services/expenseService";
import { expenseBoardService } from "../services/expenseBoardService";
import { showToast } from "../utils/toast";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { sendExpenseDeletedNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { kinetic } from "../theme/tokens";
import { SettlementActionModule } from "../components/kinetic/SettlementActionModule";
import {
  buildWhoOwesMessage,
  isValidUpiId,
  openUpiPayment,
} from "../utils/upiSettle";
import { buildBoardJoinUrl } from "../config/appLinks";

const K = kinetic.colors;

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
  const { user: authUser } = useAuth();
  const { expense: initialExpense, expenseId } = route.params || {};
  const [expense, setExpense] = useState(initialExpense || null);
  const [loading, setLoading] = useState(!initialExpense && !!expenseId);
  const [deleting, setDeleting] = useState(false);
  // Board-level participants + greedy settlements for the split breakdown.
  // The app stores no per-expense settlement rows, so per-person status is
  // the board's status: fully settled board -> everyone Settled, otherwise
  // the payer is Paid and the rest are Pending.
  const [boardDetails, setBoardDetails] = useState(null);

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

  useEffect(() => {
    if (!expense?.board_id) return;
    let cancelled = false;
    (async () => {
      try {
        const details = await expenseBoardService.getExpenseBoardsByID(
          expense.board_id
        );
        if (!cancelled && details && !Array.isArray(details)) {
          setBoardDetails(details);
        }
      } catch (error) {
        console.error("Error fetching board settlements:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expense?.board_id]);

  const handleDelete = () => {
    if (!expense?.id) return;
    Alert.alert(
      "Delete",
      "Are you sure you want to delete this expense?",
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

  const settlements = useMemo(
    () => boardDetails?.settlements || [],
    [boardDetails]
  );
  const participants = useMemo(
    () => boardDetails?.participants || [],
    [boardDetails]
  );
  const boardSettled = settlements.length === 0 && participants.length > 0;

  const myDebt = useMemo(
    () =>
      settlements.find(
        (settlement) => settlement.fromId === authUser?.id
      ) || null,
    [settlements, authUser?.id]
  );
  const amCreditor = useMemo(
    () =>
      settlements.some((settlement) => settlement.toId === authUser?.id),
    [settlements, authUser?.id]
  );

  const shareSettlements = useCallback(async () => {
    try {
      let joinUrl;
      if (expense?.board_id) {
        try {
          const code = await expenseBoardService.getBoardShareCode(
            expense.board_id
          );
          if (code) joinUrl = buildBoardJoinUrl(code);
        } catch {
          // Join link is a nice-to-have; the balances still share.
        }
      }
      const message = buildWhoOwesMessage({
        boardName: expense?.board || "Trivense",
        settlements,
        joinUrl,
      });
      await Share.share({ message });
    } catch (error) {
      if (error?.message !== "User did not share") {
        Alert.alert(t("error"), t("failedToShareSettlements"));
      }
    }
  }, [expense?.board, expense?.board_id, settlements, t]);

  const paySettlement = useCallback(
    async (settlement) => {
      if (!settlement) return;
      const note = `Trivense ${expense?.board || "settle"}`;
      if (isValidUpiId(settlement.toUpi)) {
        try {
          await openUpiPayment({
            pa: settlement.toUpi,
            pn: settlement.to,
            amount: settlement.amount,
            note,
          });
        } catch {
          Alert.alert(t("error"), t("couldNotOpenUpi"));
        }
        return;
      }
      Alert.alert(
        t("upiIdMissingTitle"),
        t("upiIdMissingBody").replace("{{name}}", settlement.to),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("shareWhoOwes"), onPress: shareSettlements },
        ]
      );
    },
    [expense?.board, shareSettlements, t]
  );

  const handleShareExpense = useCallback(async () => {
    if (!expense) return;
    const lines = [
      `${expense.description || "Expense"} — ${formatCurrency(expense.amount)}`,
      `Board: ${expense.board || "—"}`,
      `Paid by ${expense.created_by_profile?.full_name || "—"} · ${formatDateTime(expense.date || expense.created_at)}`,
    ];
    if (settlements.length > 0) {
      lines.push("", buildWhoOwesMessage({
        boardName: expense.board || "Trivense",
        settlements,
      }));
    }
    try {
      await Share.share({ message: lines.join("\n") });
    } catch (error) {
      if (error?.message !== "User did not share") {
        Alert.alert(t("error"), t("failedToShareSettlements"));
      }
    }
  }, [expense, settlements, t]);

  if (loading) {
    return (
      <ScreenLayout header={<Header title="Expense Details" onBack={() => navigation.goBack()} />}>
        <AnimatedLoader context="expenses" />
      </ScreenLayout>
    );
  }

  if (!expense) {
    return (
      <ScreenLayout header={<Header title="Expense Details" onBack={() => navigation.goBack()} />}>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {"Expense not found"}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const categoryName = typeof expense.category === "string"
    ? expense.category
    : expense.category?.name || "Uncategorized";
  const iconName = expense.icon || expense.category?.icon || "receipt";
  const amount = Number(expense.amount) || 0;
  const payerId = expense.created_by;
  const payerName = expense.created_by_profile?.full_name || "—";
  const memberCount = Math.max(participants.length, 1);
  const equalShare = Math.round((amount / memberCount) * 100) / 100;
  const settledCount = boardSettled ? memberCount : 1;
  const settledPct = Math.round((settledCount / memberCount) * 100);

  return (
    <ScreenLayout header={<Header
        title="Expense Details"
        onBack={() => navigation.goBack()}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.iconButton, { backgroundColor: theme.card }]}
              accessibilityRole="button"
              accessibilityLabel="Edit"
            >
              <MaterialCommunityIcons name="pencil" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              style={[styles.iconButton, { backgroundColor: theme.errorLight || "#FFEBEE" }]}
              accessibilityRole="button"
              accessibilityLabel="Delete"
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
        <LinearGradient
          colors={K.coralGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.amountCard}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={iconName}
              size={40}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.amount}>{formatCurrency(amount)}</Text>
          <Text style={styles.categoryBadge}>{categoryName}</Text>
          {expense.description ? (
            <Text style={styles.description}>{expense.description}</Text>
          ) : null}
          <Text style={styles.addedBy}>
            Added by {payerName} · {formatDateTime(expense.date || expense.created_at)}
          </Text>
        </LinearGradient>

        {participants.length > 0 ? (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Split Details · Equal {memberCount}-way · {formatCurrency(equalShare)} / person
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${settledPct}%`,
                    backgroundColor: boardSettled ? K.success : K.warning,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressCaption, { color: theme.textSecondary }]}>
              {settledCount} of {memberCount} settled
              {boardSettled ? "" : " · status follows the board"}
            </Text>
            {participants.map((participant) => {
              const isPayer = participant.id === payerId;
              const status = isPayer
                ? "Paid"
                : boardSettled
                  ? "Settled"
                  : "Pending";
              const statusColor = isPayer
                ? K.textPositive
                : boardSettled
                  ? K.textPositive
                  : K.warning;
              const netReceived = isPayer ? amount - equalShare : 0;
              return (
                <View
                  key={participant.id}
                  style={[styles.splitRow, { borderBottomColor: theme.borderLight }]}
                >
                  <View style={styles.splitAvatar}>
                    <Text style={styles.splitAvatarText}>
                      {(participant.name || "?").trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.splitBody}>
                    <Text style={[styles.splitName, { color: theme.text }]} numberOfLines={1}>
                      {participant.name}
                      {participant.id === authUser?.id ? " (You)" : ""}
                    </Text>
                    <Text style={[styles.splitSub, { color: theme.textSecondary }]}>
                      {isPayer
                        ? `Paid full bill · Owed ${formatCurrency(equalShare)}`
                        : `Owes ${formatCurrency(equalShare)}`}
                    </Text>
                  </View>
                  <View style={styles.splitRight}>
                    <Text style={[styles.splitStatus, { color: statusColor }]}>
                      {status}
                    </Text>
                    <Text style={[styles.splitShare, { color: theme.text }]}>
                      {isPayer && netReceived > 0
                        ? `+${formatCurrency(netReceived)}`
                        : formatCurrency(equalShare)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {(myDebt || amCreditor) && settlements.length > 0 ? (
          <View>
            {myDebt ? (
              <Text style={[styles.upiLine, { color: theme.text }]}>
                Pay {formatCurrency(myDebt.amount)} — UPI ·{" "}
                {myDebt.toUpi || `UPI ID not set for ${myDebt.to}`}
              </Text>
            ) : null}
            <SettlementActionModule
              greedySummary={
                settlements.length > 1
                  ? `Greedy AI collapses ${settlements.length} dues into direct UPI transfers`
                  : null
              }
              greedyCount={settlements.length}
              onRequestUpi={myDebt ? () => paySettlement(myDebt) : undefined}
              onWhatsappNudge={shareSettlements}
            />
          </View>
        ) : boardSettled && participants.length > 0 ? (
          <View style={[styles.settledBanner, { backgroundColor: K.tintGreen, borderColor: "#BBF7D0" }]}>
            <MaterialCommunityIcons name="check-circle" size={20} color={K.success} />
            <Text style={[styles.settledBannerText, { color: K.textPositive }]}>
              All settled on this board
            </Text>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {"Details"}
          </Text>
          <DetailRow
            icon="calendar"
            label={t("date") || "Date"}
            value={formatDateTime(expense.date || expense.created_at)}
            theme={theme}
          />
          <DetailRow
            icon="view-dashboard-outline"
            label="Board"
            value={expense.board || "—"}
            theme={theme}
          />
          <DetailRow
            icon="credit-card-outline"
            label={t("paymentMethod") || "Payment method"}
            value={paymentMethodLabel(expense.payment_method)}
            theme={theme}
          />
          <DetailRow
            icon="wallet-outline"
            label="Paid via"
            value={paymentMethodLabel(expense.payment_method)}
            theme={theme}
          />
          {expense.created_by_profile ? (
            <DetailRow
              icon="account-outline"
              label="Added by"
              value={expense.created_by_profile.full_name || "—"}
              theme={theme}
            />
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Expense History
          </Text>
          <DetailRow
            icon="plus-circle-outline"
            label="Logged"
            value={`${payerName} · ${formatDateTime(expense.date || expense.created_at)}`}
            theme={theme}
          />
        </View>

        <View style={styles.actionRow}>
          {myDebt ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.settleButton]}
              onPress={() => paySettlement(myDebt)}
              accessibilityRole="button"
              accessibilityLabel="Settle up"
              activeOpacity={0.9}
            >
              <Text style={styles.settleButtonText}>
                Settle Up · {formatCurrency(myDebt.amount)}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
            onPress={handleShareExpense}
            accessibilityRole="button"
            accessibilityLabel="Share"
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.text }]}>
              {"Share"}
            </Text>
          </TouchableOpacity>
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
    gap: 16,
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
    borderRadius: kinetic.radii.xl,
    padding: 24,
    alignItems: "center",
    ...kinetic.shadows.elevated,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  amount: {
    ...kinetic.typography.displayLarge,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  categoryBadge: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 8,
    color: "#FFFFFF",
  },
  addedBy: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 10,
    textAlign: "center",
  },
  section: {
    borderRadius: kinetic.radii.lg,
    borderWidth: 1,
    borderColor: K.border,
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
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: K.subtle,
    overflow: "hidden",
    marginHorizontal: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressCaption: {
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  splitAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D6E4ED",
    alignItems: "center",
    justifyContent: "center",
  },
  splitAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: K.navy,
  },
  splitBody: {
    flex: 1,
    minWidth: 0,
  },
  splitName: {
    fontSize: 14,
    fontWeight: "600",
  },
  splitSub: {
    fontSize: 12,
    marginTop: 2,
  },
  splitRight: {
    alignItems: "flex-end",
  },
  splitStatus: {
    fontSize: 12,
    fontWeight: "700",
  },
  splitShare: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  upiLine: {
    ...kinetic.typography.bodyMedium,
    marginBottom: 8,
  },
  settledBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: kinetic.radii.lg,
    padding: 14,
  },
  settledBannerText: {
    ...kinetic.typography.bodyMedium,
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
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 16,
  },
  settleButton: {
    backgroundColor: K.coral,
    ...kinetic.shadows.ctaCoral,
  },
  settleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ExpenseDetailsScreen;
