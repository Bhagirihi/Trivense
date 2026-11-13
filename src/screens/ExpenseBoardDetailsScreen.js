import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { ScreenActionBar } from "../components/ui/ScreenActionBar";
import ShareModal from "../components/ShareModal";
import { expenseBoardService } from "../services/expenseBoardService";
import { expenseService } from "../services/expenseService";
import { supabase } from "../config/supabase";
import { realTimeSync } from "../services/realTimeSync";
import { showToast } from "../utils/toast";
import { useNavigation, useRoute } from "@react-navigation/native";
import { formatCurrency } from "../utils/formatters";
import { devLog } from "../utils/logger";
import ExpenseItem from "../components/ExpenseItem";
import { FEATURES } from "../config/subscriptionPlans";
import { subscriptionService } from "../services/subscriptionService";
import { useSubscription } from "../context/SubscriptionContext";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { useAdPolicy } from "../context/AdPolicyContext";
import {
  LockedActionButton,
} from "../components/LockedFeature";
import InlineListAd from "../components/InlineListAd";
import PremiumFeatureAd from "../components/PremiumFeatureAd";
import { SettlementActionModule } from "../components/kinetic/SettlementActionModule";
import { SponsoredAdSlot } from "../components/kinetic/SponsoredAdSlot";
import {
  interleaveListWithAds,
  isAdListItem,
} from "../utils/listWithAds";
import { LIST_AD_INTERVAL_TRANSACTIONS } from "../config/admob";
import { useTranslation } from "../hooks/useTranslation";
import { kinetic } from "../theme/tokens";
import { fromPaise } from "../utils/settlements";
import {
  buildWhoOwesMessage,
  isValidUpiId,
  openUpiPayment,
} from "../utils/upiSettle";
import { buildBoardJoinUrl } from "../config/appLinks";

const K = kinetic.colors;

export const ExpenseBoardDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();

  const { boardId, boardName, totalExpenses, totalBudget, totalTransactions } =
    route.params;
  const { theme } = useTheme();
  const { subscription, requireFeature, paymentsEnabled } = useSubscription();
  const { isAdFree } = useAdEntitlement();
  const { showBannerAds } = useAdPolicy();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [expenses, setExpenses] = useState([]);
  const [, setTotalCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [isBoardOwner, setIsBoardOwner] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [currentUserId, setCurrentUserId] = useState(null);
  // Real member balances + settlements from getExpenseBoardsByID
  // (settlements.js integer-paise math). Null while loading / on error.
  const [analysis, setAnalysis] = useState(null);

  const ITEMS_PER_PAGE = 10;

  const expenseListData = useMemo(() => {
    if (!showBannerAds || isAdFree || expenses.length === 0) return expenses;
    return interleaveListWithAds(expenses, {
      interval: LIST_AD_INTERVAL_TRANSACTIONS,
      adKeyPrefix: "board-txn-ad",
    });
  }, [expenses, isAdFree, showBannerAds]);

  const fetchAnalysis = useCallback(async () => {
    try {
      const data = await expenseBoardService.getExpenseBoardsByID(boardId);
      if (!data || Array.isArray(data)) {
        setAnalysis(null);
        return;
      }
      setAnalysis({
        participants: data.participants || [],
        settlements: data.settlements || [],
      });
    } catch (error) {
      console.error("Error fetching board settlements:", error);
      setAnalysis(null);
    }
  }, [boardId]);

  const fetchData = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { data: transactionsData, count } =
        await expenseService.getExpensesbyBoardId(
          boardId,
          null,
          pageNum,
          ITEMS_PER_PAGE
        );

      if (isRefreshing || pageNum === 1) {
        setExpenses(transactionsData || []);
        setTotalCount(count || 0);
      } else {
        setExpenses((prev) => [...prev, ...(transactionsData || [])]);
      }

      setHasMore((transactionsData?.length || 0) === ITEMS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast.error("Error loading data");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchData();
    fetchAnalysis();
  }, [fetchData, fetchAnalysis]);

  useEffect(() => {
    const unsubscribe = realTimeSync.subscribeToExpense(
      () => {
        fetchData(1, true);
        fetchAnalysis();
      },
      "realtime-expenses-board-details"
    );
    return unsubscribe;
  }, [fetchData, fetchAnalysis]);

  useEffect(() => {
    const loadBoardMeta = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
        const { data: board } = await supabase
          .from("expense_boards")
          .select("share_code, created_by")
          .eq("id", boardId)
          .maybeSingle();

        if (board) {
          setShareCode(board.share_code || boardId);
          setIsBoardOwner(user?.id === board.created_by);
        }
      } catch (error) {
        console.error("Error loading board metadata:", error);
      }
    };

    loadBoardMeta();
  }, [boardId]);

  const onRefresh = useCallback(() => {
    fetchData(1, true);
    fetchAnalysis();
  }, [fetchData, fetchAnalysis]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchData(page + 1);
    }
  };

  const handleDeleteBoard = async () => {
    try {
      await expenseBoardService.deleteExpenseBoard(boardId);
      showToast.success("Expense board deleted successfully");
      navigation.goBack();
    } catch (error) {
      console.error("Error deleting board:", error);
      showToast.error("Failed to delete expense board");
    }
  };

  const handleShareBoard = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast.error(t("error"), "Please sign in again");
        return;
      }

      if (paymentsEnabled) {
        const shareCheck = await subscriptionService.canShareBoardWithLimit(
          subscription,
          user.id,
          boardId
        );
        if (!shareCheck.allowed) {
          const unlocked = requireFeature(FEATURES.BOARD_SHARING, navigation);
          if (!unlocked) return;
        }
      }

      setShowShareModal(true);
    } catch (error) {
      console.error("Error opening share:", error);
      showToast.error(t("error"), error.message || "Failed to open share");
    }
  };

  const handleInviteByEmail = async (email) => {
    await expenseBoardService.shareBoardWithEmail(boardId, email);
  };

  // --- Settlement flows (same real flows as AnalysisScreen) ---
  const shareWhoOwes = useCallback(async () => {
    try {
      const message = buildWhoOwesMessage({
        boardName,
        settlements: analysis?.settlements || [],
        joinUrl: boardId ? buildBoardJoinUrl(boardId) : undefined,
      });
      await Share.share({ message });
    } catch (error) {
      if (error?.message !== "User did not share") {
        Alert.alert(t("error"), t("failedToShareSettlements"));
      }
    }
  }, [analysis, boardId, boardName, t]);

  // The signed-in user's own outstanding debt, if any (first payable one).
  const mySettlement = useMemo(() => {
    if (!analysis || !currentUserId) return null;
    return (
      analysis.settlements.find(
        (s) => s.fromId === currentUserId && isValidUpiId(s.toUpi)
      ) || null
    );
  }, [analysis, currentUserId]);

  const paySettlement = useCallback(async () => {
    if (!mySettlement) return;
    const note = `Trivense ${boardName || "settle"}`;
    try {
      await openUpiPayment({
        pa: mySettlement.toUpi,
        pn: mySettlement.to,
        amount: mySettlement.amount,
        note,
      });
    } catch {
      Alert.alert(t("error"), t("couldNotOpenUpi"));
    }
  }, [mySettlement, boardName, t]);

  // Greedy summary: honest about what the settlements actually collapse.
  const greedySummary = useMemo(() => {
    const settlements = analysis?.settlements || [];
    if (settlements.length === 0) return null;
    if (mySettlement) {
      return "Smart settlement: your due collapses into 1 direct UPI transfer";
    }
    return `Smart settlement: ${settlements.length} simple transfer${settlements.length === 1 ? "" : "s"} resolve${settlements.length === 1 ? "s" : ""} all dues`;
  }, [analysis, mySettlement]);

  const myBalancePaise = useMemo(() => {
    const me = (analysis?.participants || []).find(
      (p) => p.id === currentUserId
    );
    return me ? me.balancePaise || 0 : 0;
  }, [analysis, currentUserId]);

  if (loading && page === 1) {
    return (
      <ScreenLayout header={<Header title="Loading..." onBack={() => navigation.goBack()} />}>
        <AnimatedLoader context="boards" />
      </ScreenLayout>
    );
  }

  const remainingBudget = totalBudget - totalExpenses;
  const budgetPct = Math.min(
    Math.round((totalExpenses / (totalBudget || 1)) * 100),
    100
  );
  const myBalance = fromPaise(Math.abs(myBalancePaise));

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="receipt"
          size={32}
          color={K.navy}
        />
      </View>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start by adding your first expense to this board
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddExpense", { boardId })}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Expense</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadMore = () => {
    if (!hasMore) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={loadMore}
        disabled={loadingMore}
        accessibilityRole="button"
        accessibilityLabel="Load more"
      >
        {loadingMore ? (
          <ActivityIndicator size="small" color={K.navy} />
        ) : (
          <>
            <MaterialCommunityIcons
              name="arrow-down"
              size={20}
              color={K.navy}
            />
            <Text style={styles.loadMoreText}>Load More</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderTab = (key, label) => {
    const selected = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => setActiveTab(key)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        style={[styles.tab, selected && styles.tabSelected]}
      >
        <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMemberRow = (participant) => {
    const isMe = participant.id === currentUserId;
    const balance = fromPaise(participant.balancePaise || 0);
    const initial = String(participant.name || "?").trim().charAt(0).toUpperCase();
    return (
      <View key={participant.id} style={styles.memberRow}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>{initial}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {participant.name}
            {isMe ? " (You)" : ""}
          </Text>
          <Text style={styles.memberSpent}>
            Spent {formatCurrency(participant.spent || 0)}
          </Text>
        </View>
        <View style={styles.memberBalance}>
          {balance > 0 ? (
            <>
              <Text style={[styles.memberBalanceValue, { color: K.textPositive }]}>
                +{formatCurrency(balance)}
              </Text>
              <Text style={styles.memberBalanceLabel}>Gets back</Text>
            </>
          ) : balance < 0 ? (
            <>
              <Text style={[styles.memberBalanceValue, { color: K.textNegative }]}>
                -{formatCurrency(Math.abs(balance))}
              </Text>
              <Text style={styles.memberBalanceLabel}>Owes pool</Text>
            </>
          ) : (
            <>
              <Text style={styles.memberBalanceValue}>{formatCurrency(0)}</Text>
              <Text style={styles.memberBalanceLabel}>Settled</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderMembersTab = () => {
    if (!analysis) {
      return (
        <View style={styles.tabEmpty}>
          <Text style={styles.tabEmptyText}>
            Balances could not be loaded. Pull to refresh to try again.
          </Text>
        </View>
      );
    }
    const participants = analysis.participants || [];
    const settlements = analysis.settlements || [];
    return (
      <View>
        <Text style={styles.sectionTitle}>
          Members and Balances ({participants.length})
        </Text>
        {participants.length === 0 ? (
          <View style={styles.tabEmpty}>
            <Text style={styles.tabEmptyText}>No members on this board yet.</Text>
          </View>
        ) : (
          <View style={styles.membersCard}>
            {participants.map(renderMemberRow)}
          </View>
        )}
        {settlements.length > 0 ? (
          <View style={styles.settleModuleWrap}>
            <SettlementActionModule
              greedySummary={greedySummary}
              greedyCount={mySettlement ? 1 : 0}
              onRequestUpi={mySettlement ? paySettlement : undefined}
              onWhatsappNudge={shareWhoOwes}
            />
          </View>
        ) : (
          <View style={styles.allSettledRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={K.success}
            />
            <Text style={styles.allSettledText}>All payments settled</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.inviteRow}
          onPress={handleShareBoard}
          accessibilityRole="button"
          accessibilityLabel="Invite members"
        >
          <View style={styles.inviteIcon}>
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={20}
              color={K.navy}
            />
          </View>
          <View style={styles.inviteTextCol}>
            <Text style={styles.inviteTitle}>Invite Friend</Text>
            <Text style={styles.inviteSub}>
              Join code {shareCode || boardId}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={K.textTertiary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderAnalyticsTab = () => {
    if (!analysis) {
      return (
        <View style={styles.tabEmpty}>
          <Text style={styles.tabEmptyText}>
            Analytics could not be loaded. Pull to refresh to try again.
          </Text>
        </View>
      );
    }
    const participants = analysis.participants || [];
    const maxSpent = Math.max(0, ...participants.map((p) => p.spent || 0));
    const totalSpent = participants.reduce(
      (sum, p) => sum + (p.spent || 0),
      0
    );
    const perPerson =
      participants.length > 0 ? totalSpent / participants.length : 0;
    return (
      <View>
        <Text style={styles.sectionTitle}>Spending Breakdown</Text>
        <View style={styles.analyticsCard}>
          <View style={styles.analyticsRow}>
            <Text style={styles.analyticsLabel}>Total spent</Text>
            <Text style={styles.analyticsValue}>{formatCurrency(totalSpent)}</Text>
          </View>
          <View style={styles.analyticsRow}>
            <Text style={styles.analyticsLabel}>Fair share each</Text>
            <Text style={styles.analyticsValue}>{formatCurrency(perPerson)}</Text>
          </View>
          <View style={styles.analyticsRow}>
            <Text style={styles.analyticsLabel}>Budget used</Text>
            <Text style={styles.analyticsValue}>{budgetPct}%</Text>
          </View>
        </View>
        {participants.length === 0 ? (
          <View style={styles.tabEmpty}>
            <Text style={styles.tabEmptyText}>No spending to break down yet.</Text>
          </View>
        ) : (
          <View style={styles.analyticsCard}>
            {participants.map((p) => (
              <View key={p.id} style={styles.barRow}>
                <View style={styles.barHeader}>
                  <Text style={styles.barName} numberOfLines={1}>
                    {p.name}
                    {p.id === currentUserId ? " (You)" : ""}
                  </Text>
                  <Text style={styles.barAmount}>
                    {formatCurrency(p.spent || 0)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${maxSpent > 0 ? Math.max(((p.spent || 0) / maxSpent) * 100, 2) : 0}%`,
                        backgroundColor: K.navy,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderExpensesTab = () => {
    if (expenses.length === 0) return renderEmptyState();
    return (
      <View>
        <View style={styles.transactionsHeader}>
          <Text style={styles.headerTitle}>
            Transactions ({totalTransactions})
          </Text>
        </View>
        <View>
          {expenseListData.map((item) =>
            isAdListItem(item) ? (
              <View key={item.id} style={styles.adWrap}>
                <SponsoredAdSlot>
                  <InlineListAd />
                </SponsoredAdSlot>
              </View>
            ) : (
              <ExpenseItem
                key={item.id}
                expense={item}
                onPress={() =>
                  navigation.navigate("ExpenseDetails", {
                    expenseId: item.id,
                  })
                }
                onDelete={() => {
                  devLog("Delete expense:", item.id);
                }}
              />
            )
          )}
        </View>
        {renderLoadMore()}
      </View>
    );
  };

  return (
    <ScreenLayout header={<Header
        title={boardName}
        onBack={() => navigation.goBack()}
        rightComponent={
          isBoardOwner ? (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleShareBoard}
                accessibilityRole="button"
                accessibilityLabel="Share board"
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDeleteBoard}
                accessibilityRole="button"
                accessibilityLabel="Delete board"
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;
          if (isCloseToBottom && !loadingMore && hasMore) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View style={styles.content}>
          <View style={styles.statsCard}>
            <View style={styles.statsMain}>
              <View style={styles.statsRow}>
                <View style={styles.statsLabelContainer}>
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={20}
                    color={K.textPrimary}
                    style={styles.statsIcon}
                  />
                  <Text style={styles.statsLabel}>Budget</Text>
                </View>
                <Text style={styles.statsValue}>
                  {formatCurrency(totalBudget)}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statsLabelContainer}>
                  <MaterialCommunityIcons
                    name="cash-remove"
                    size={20}
                    color={K.textPrimary}
                    style={styles.statsIcon}
                  />
                  <Text style={styles.statsLabel}>Spent</Text>
                </View>
                <Text style={styles.statsValue}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>

              <View style={[styles.statsRow, styles.remainingRow]}>
                <View style={styles.statsLabelContainer}>
                  <MaterialCommunityIcons
                    name="cash-check"
                    size={20}
                    color={remainingBudget >= 0 ? K.success : K.danger}
                    style={styles.statsIcon}
                  />
                  <Text
                    style={[
                      styles.statsLabel,
                      {
                        color:
                          remainingBudget >= 0 ? K.success : K.danger,
                      },
                    ]}
                  >
                    Remaining
                  </Text>
                </View>
                <Text
                  style={[
                    styles.statsValue,
                    {
                      color: remainingBudget >= 0 ? K.success : K.danger,
                    },
                  ]}
                >
                  {formatCurrency(remainingBudget)}
                </Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Budget used</Text>
                <Text
                  style={[
                    styles.progressPct,
                    { color: remainingBudget >= 0 ? K.textPrimary : K.danger },
                  ]}
                >
                  {budgetPct}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${budgetPct}%`,
                      backgroundColor: kinetic.gaugeColor(budgetPct),
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {analysis && analysis.participants.length > 0 ? (
            <View style={styles.positionCard}>
              <Text style={styles.positionLabel}>YOUR CURRENT POSITION</Text>
              <Text
                style={[
                  styles.positionValue,
                  {
                    color:
                      myBalancePaise > 0
                        ? K.textPositive
                        : myBalancePaise < 0
                          ? K.textNegative
                          : K.textPrimary,
                  },
                ]}
              >
                {myBalancePaise > 0
                  ? `+${formatCurrency(myBalance)}`
                  : myBalancePaise < 0
                    ? `-${formatCurrency(myBalance)}`
                    : formatCurrency(0)}
              </Text>
              <Text style={styles.positionSub}>
                {myBalancePaise > 0
                  ? "You get back"
                  : myBalancePaise < 0
                    ? "You owe the pool"
                    : "You are settled up"}
              </Text>
            </View>
          ) : null}

          <View
            style={styles.tabBar}
            accessibilityRole="tablist"
          >
            {renderTab("expenses", "Expenses")}
            {renderTab("members", "Members")}
            {renderTab("analytics", "Analytics")}
          </View>

          {activeTab === "expenses"
            ? renderExpensesTab()
            : activeTab === "members"
              ? renderMembersTab()
              : renderAnalyticsTab()}
        </View>
      </ScrollView>
      <ScreenActionBar style={styles.bottomButtons}>
        <PremiumFeatureAd style={{ marginBottom: 8 }} />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addExpenseButton]}
            onPress={() => navigation.navigate("AddExpense", { boardId })}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color="#FFFFFF"
            />
            <Text style={[styles.actionButtonText, { color: "#FFFFFF" }]}>
              Add Expense
            </Text>
          </TouchableOpacity>

          <LockedActionButton
            feature={FEATURES.BOARD_SETTLEMENTS}
            navigation={navigation}
            style={[styles.actionButton, styles.settleButton]}
            icon="scale-balance"
            label={t("settlements")}
            onPress={() => navigation.navigate("Analysis", { boardId })}
          />
        </View>
      </ScreenActionBar>
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardName={boardName}
        boardId={boardId}
        shareCode={shareCode}
        boardColor={theme.primary}
        boardIcon="view-grid"
        onInviteEmail={isBoardOwner ? handleInviteByEmail : undefined}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    backgroundColor: K.canvas,
  },
  statsCard: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    padding: 16,
    borderRadius: kinetic.radii.lg,
    marginBottom: 16,
    ...kinetic.shadows.card,
  },
  statsMain: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  remainingRow: {
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: K.border,
    marginBottom: 0,
  },
  statsLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsIcon: {
    marginRight: 8,
  },
  statsLabel: {
    ...kinetic.typography.body,
    color: K.textPrimary,
  },
  statsValue: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
  },
  progressSection: { gap: 8 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
  },
  progressPct: {
    ...kinetic.typography.caption,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: kinetic.radii.full,
    backgroundColor: K.subtle,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: kinetic.radii.full,
  },
  positionCard: {
    backgroundColor: K.navy,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    marginBottom: 16,
  },
  positionLabel: {
    ...kinetic.typography.captionBold,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.6,
  },
  positionValue: {
    ...kinetic.typography.displayMedium,
    color: "#FFFFFF",
    marginTop: 4,
  },
  positionSub: {
    ...kinetic.typography.caption,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: K.subtle,
    borderRadius: kinetic.radii.full,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: kinetic.radii.full,
  },
  tabSelected: {
    backgroundColor: K.card,
    ...kinetic.shadows.card,
  },
  tabText: {
    ...kinetic.typography.bodyMedium,
    color: K.textSecondary,
  },
  tabTextSelected: {
    color: K.navy,
    fontWeight: "700",
  },
  sectionTitle: {
    ...kinetic.typography.headingMedium,
    color: K.textPrimary,
    marginBottom: 12,
  },
  tabEmpty: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  tabEmptyText: {
    ...kinetic.typography.body,
    color: K.textSecondary,
    textAlign: "center",
  },
  membersCard: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    paddingHorizontal: 16,
    ...kinetic.shadows.card,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: K.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D6E4ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: K.navy,
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
  },
  memberSpent: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
    marginTop: 2,
  },
  memberBalance: { alignItems: "flex-end" },
  memberBalanceValue: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
  },
  memberBalanceLabel: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
    marginTop: 2,
  },
  settleModuleWrap: { marginTop: 16 },
  allSettledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: K.tintGreen,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: kinetic.radii.lg,
    padding: 16,
    marginTop: 16,
  },
  allSettledText: {
    ...kinetic.typography.bodyMedium,
    color: K.textPositive,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 12,
    marginTop: 16,
    minHeight: 56,
    gap: 12,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: kinetic.radii.md,
    backgroundColor: K.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteTextCol: { flex: 1 },
  inviteTitle: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
  },
  inviteSub: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
    marginTop: 2,
  },
  analyticsCard: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    marginBottom: 16,
    ...kinetic.shadows.card,
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  analyticsLabel: {
    ...kinetic.typography.body,
    color: K.textSecondary,
  },
  analyticsValue: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
  },
  barRow: { marginBottom: 12 },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  barName: {
    ...kinetic.typography.bodyMedium,
    color: K.textPrimary,
    flex: 1,
  },
  barAmount: {
    ...kinetic.typography.bodyMedium,
    color: K.textPrimary,
  },
  barTrack: {
    height: 8,
    borderRadius: kinetic.radii.full,
    backgroundColor: K.subtle,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: kinetic.radii.full },
  bottomButtons: {
    paddingHorizontal: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: 12,
    borderRadius: kinetic.radii.md,
  },
  addExpenseButton: {
    backgroundColor: K.coral,
    ...kinetic.shadows.ctaCoral,
  },
  settleButton: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.borderStrong,
  },
  actionButtonText: {
    ...kinetic.typography.headingSmall,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: kinetic.radii.full,
    backgroundColor: K.coral,
    ...kinetic.shadows.ctaCoral,
  },
  addButtonText: {
    ...kinetic.typography.headingSmall,
    color: "#FFFFFF",
    marginLeft: 8,
  },
  headerTitle: {
    ...kinetic.typography.headingLarge,
    color: K.textPrimary,
    marginBottom: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginTop: 40,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: K.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    ...kinetic.typography.headingMedium,
    color: K.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    ...kinetic.typography.body,
    color: K.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: 12,
    borderRadius: kinetic.radii.md,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    marginTop: 12,
  },
  loadMoreText: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
    marginLeft: 8,
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  adWrap: { marginBottom: 12 },
});
