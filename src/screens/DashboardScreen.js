import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Animated,
  Easing,
  Alert,
  Share,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../config/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { expenseService } from "../services/expenseService";
import { expenseBoardService } from "../services/expenseBoardService";
import ThemeToggle from "../components/ThemeToggle";
import { ScreenLayout } from "../components/ScreenLayout";
import ExpenseList from "../components/ExpenseList";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { AppTabHeader } from "../components/ui/AppTabHeader";
import { PlanBadge } from "../components/ui/PlanBadge";
import { HomeSectionHeader } from "../components/home/HomeSectionHeader";
import { HomeBrowseLink } from "../components/home/HomeBrowseLink";
import { HomeInlineAd } from "../components/home/HomeInlineAd";
import AdSupportedAccessBanner from "../components/AdSupportedAccessBanner";
import { showToast } from "../utils/toast";
import { formatCurrency } from "../utils/formatters";
import { getLocalizedGreeting, getFirstName } from "../utils/greeting";
import { notificationService } from "../services/notificationService";
import { realTimeSync } from "../services/realTimeSync";
import {
  sendCreateCategoryNotification,
  sendCreateExpenseBoardNotification,
  sendCreateExpenseNotification,
  sendDeleteCategoryNotification,
  sendExpenseBoardInviteNotification,
  sendExpenseDeletedNotification,
  sendExpenseOverBudgetNotification,
  sendPushNotification,
  sendUpdateCategoryNotification,
} from "../services/pushNotificationService";
import { useFocusEffect } from "@react-navigation/native";
import { fetchDashboardData } from "../fetcher";
import { isOnboardingComplete } from "../utils/onboardingStorage";
import {
  shouldShowPostRegisterSetup,
} from "../utils/postRegisterSetupStorage";
import { isTourCompleted } from "../utils/appCueStorage";
import { useAppCue } from "../context/AppCueContext";
import { useTranslation } from "../hooks/useTranslation";
import { devLog } from "../utils/logger";
import { QuickActionTile } from "../components/ui/UIKit";
import { styles } from "./dashboard/dashboardStyles";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";
import { kinetic } from "../theme/tokens";
import { HeroBalanceCard } from "../components/kinetic/HeroBalanceCard";
import { BoardCard } from "../components/kinetic/BoardCard";
import { SettlementActionModule } from "../components/kinetic/SettlementActionModule";
import { SponsoredAdSlot } from "../components/kinetic/SponsoredAdSlot";
import { computeExpenseStreak } from "../utils/streak";
import {
  buildWhoOwesMessage,
  isValidUpiId,
  openUpiPayment,
} from "../utils/upiSettle";
import { buildBoardJoinUrl } from "../config/appLinks";

const K = kinetic.colors;

export const DashboardScreen = ({ navigation }) => {
  const { startTour, activeHighlight, isActive: cueActive } = useAppCue();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { paymentsEnabled, loading: subscriptionLoading } = useSubscription();
  const scrollBottomPadding = useFooterScrollPadding(0, false);
  const recentLimit = Platform.OS === "android" ? 5 : 4;
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [hasBoards, setHasBoards] = useState(false);
  const [boards, setBoards] = useState([]);
  const [boardDetails, setBoardDetails] = useState({});
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalExpenses: 0,
    remainingBudget: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const { greeting, subtitle: dashboardSubtitle } = getLocalizedGreeting(t);
  const firstName = getFirstName(userProfile?.full_name, t("guest"));
  // Header keeps the Trivense wordmark (AppTabHeader) + "Dashboard" label;
  // the greeting lives in the content greeting row below.
  const headerTitle = "Dashboard";
  const headerSubtitle = dashboardSubtitle;
  const moreExpenseCount = Math.max(expenses.length - recentLimit, 0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const loadProfile = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const { data } = await getUserProfile(authUser.id);
      if (data) setUserProfile(data);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }, [authUser?.id]);

  const fetchDashboardDataState = useCallback(async () => {
    try {
      const data = await fetchDashboardData();
      setExpenses(data.recentTransactions);
      setHasBoards(data.hasBoard);
      setStats(data.stats);
      devLog(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }, []);

  // Real per-board settlements (participants + greedy settlements) so the
  // hero, settlement module and board cards all show live balances.
  const fetchBoardData = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const list = await expenseBoardService.getExpenseBoards();
      setBoards(list || []);
      const entries = await Promise.allSettled(
        (list || []).map(async (board) => {
          const details = await expenseBoardService.getExpenseBoardsByID(
            board.id
          );
          return [board.id, details];
        })
      );
      const detailsById = {};
      entries.forEach((entry) => {
        if (entry.status !== "fulfilled") return;
        const [boardId, details] = entry.value;
        if (details && !Array.isArray(details)) detailsById[boardId] = details;
      });
      setBoardDetails(detailsById);
    } catch (error) {
      console.error("Error fetching board settlements:", error);
    }
  }, [authUser?.id]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // Live net position for the signed-in user across all boards.
  const { owedToYou, youOwe, userSettlements } = useMemo(() => {
    const userId = authUser?.id;
    if (!userId) return { owedToYou: 0, youOwe: 0, userSettlements: [] };
    let owed = 0;
    let owe = 0;
    const mine = [];
    Object.values(boardDetails).forEach((details) => {
      (details.settlements || []).forEach((settlement) => {
        if (settlement.toId === userId) {
          owed += Number(settlement.amount) || 0;
          mine.push(settlement);
        } else if (settlement.fromId === userId) {
          owe += Number(settlement.amount) || 0;
          mine.push(settlement);
        }
      });
    });
    return { owedToYou: owed, youOwe: owe, userSettlements: mine };
  }, [boardDetails, authUser?.id]);

  const netPosition = owedToYou - youOwe;

  // Real expense streak from the expenses already loaded on this screen.
  const streak = useMemo(
    () =>
      computeExpenseStreak(
        expenses.map((expense) => expense.date || expense.created_at)
      ),
    [expenses]
  );

  const memoizedCalculateMonthlyStats = useCallback(
    (expensesData) => {
      const totalExpenses = expensesData.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const budgetUsage = (totalExpenses / (stats.totalBudget || 1)) * 100;

      // Check budget usage thresholds and send notifications
      if (budgetUsage >= 100) {
        sendExpenseOverBudgetNotification({
          boardName: "Dashboard",
          icon: "alert",
          iconColor: "#F44336",
          budgetAmount: stats.totalBudget,
          expenseAmount: totalExpenses,
        });
      } else if (budgetUsage >= 90) {
        sendExpenseOverBudgetNotification({
          boardName: "Dashboard",
          icon: "alert",
          iconColor: "#F44336",
          budgetAmount: stats.totalBudget,
          expenseAmount: totalExpenses,
        });
      } else if (budgetUsage >= 70) {
        sendExpenseOverBudgetNotification({
          boardName: "Dashboard",
          icon: "alert",
          iconColor: "#FF9800",
          budgetAmount: stats.totalBudget,
          expenseAmount: totalExpenses,
        });
      } else if (budgetUsage >= 50) {
        sendExpenseOverBudgetNotification({
          boardName: "Dashboard",
          icon: "alert",
          iconColor: "#FFC107",
          budgetAmount: stats.totalBudget,
          expenseAmount: totalExpenses,
        });
      }

      setStats((prevStats) => ({
        ...prevStats,
        totalExpenses,
        remainingBudget: prevStats.totalBudget - totalExpenses,
      }));
    },
    [stats.totalBudget]
  );

  useEffect(() => {
    const stop = realTimeSync(async () => {
      await fetchDashboardDataState();
      await fetchBoardData();
      await fetchUnreadCount();
    });
    return stop;
  }, [fetchDashboardDataState, fetchBoardData, fetchUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (authUser?.id && (await shouldShowPostRegisterSetup(authUser.id))) {
          if (active) navigation.replace("PostRegisterSetup");
          return;
        }
        const done = await isOnboardingComplete();
        if (active && !done) {
          navigation.navigate("Onboarding");
        }
      })();
      return () => {
        active = false;
      };
    }, [navigation, authUser?.id])
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      fetchDashboardDataState();
      fetchBoardData();
      fetchUnreadCount();
    }, [loadProfile, fetchDashboardDataState, fetchBoardData, fetchUnreadCount])
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let timer;
      (async () => {
        const onboardingDone = await isOnboardingComplete();
        if (!active || !onboardingDone || cueActive) return;
        const tourDone = await isTourCompleted("dashboard");
        if (!active || tourDone) return;
        timer = setTimeout(() => {
          if (active) startTour("dashboard", { hasBoards });
        }, 700);
      })();
      return () => {
        active = false;
        if (timer) clearTimeout(timer);
      };
    }, [hasBoards, startTour, cueActive])
  );

  useEffect(() => {
    if (loading) {
      // Fade and scale animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Continuous rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [loading, fadeAnim, pulseAnim, rotateAnim, scaleAnim]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadProfile(),
      fetchDashboardDataState(),
      fetchBoardData(),
      fetchUnreadCount(),
    ]);
    setRefreshing(false);
  }, [loadProfile, fetchDashboardDataState, fetchBoardData, fetchUnreadCount]);

  const handleDeletePress = async (expenseId) => {
    try {
      await expenseService.deleteExpense(expenseId);
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

  // --- Real settlement flows (UPI / share) ---------------------------------
  const shareSettlements = useCallback(
    async (settlements, boardName, boardId) => {
      try {
        let joinUrl;
        if (boardId) {
          try {
            const code = await expenseBoardService.getBoardShareCode(boardId);
            if (code) joinUrl = buildBoardJoinUrl(code);
          } catch {
            // Join link is a nice-to-have; the balances still share.
          }
        }
        const message = buildWhoOwesMessage({
          boardName: boardName || "Trivense",
          settlements,
          joinUrl,
        });
        await Share.share({ message });
      } catch (error) {
        if (error?.message !== "User did not share") {
          Alert.alert(t("error"), t("failedToShareSettlements"));
        }
      }
    },
    [t]
  );

  const paySettlement = useCallback(
    async (settlement, boardName) => {
      if (!settlement) return;
      const note = `Trivense ${boardName || "settle"}`;
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
          {
            text: t("shareWhoOwes"),
            onPress: () =>
              shareSettlements([settlement], boardName, settlement.boardId),
          },
        ]
      );
    },
    [shareSettlements, t]
  );

  // First settlement where the user is the debtor (the one they can pay).
  const payableSettlement = useMemo(
    () =>
      userSettlements.find(
        (settlement) => settlement.fromId === authUser?.id
      ) || null,
    [userSettlements, authUser?.id]
  );

  const handleSmartSettle = useCallback(() => {
    if (payableSettlement) {
      const board = boards.find(
        (item) =>
          (boardDetails[item.id]?.settlements || []).includes(
            payableSettlement
          )
      );
      paySettlement(payableSettlement, board?.name);
    }
  }, [payableSettlement, boards, boardDetails, paySettlement]);

  const handleNudge = useCallback(() => {
    if (!userSettlements.length) {
      showToast.success("All settled", "Nobody owes anything right now.");
      return;
    }
    const board = boards.find((item) =>
      (boardDetails[item.id]?.settlements || []).some((settlement) =>
        userSettlements.includes(settlement)
      )
    );
    shareSettlements(userSettlements, board?.name, board?.id);
  }, [userSettlements, boards, boardDetails, shareSettlements]);

  const budgetPercent = Math.min(
    100,
    Math.round((stats.totalExpenses / (stats.totalBudget || 1)) * 100)
  );

  const renderGreeting = () => (
    <View style={styles.greetingRow}>
      <Text style={styles.greetingText} numberOfLines={2}>
        {`${greeting}, ${firstName}`}
      </Text>
      {streak >= 1 ? (
        <View style={styles.streakPill}>
          <MaterialCommunityIcons name="fire" size={16} color={K.warning} />
          <Text style={styles.streakText}>
            {streak}d Streak
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderMonthlyBudgetGauge = () => {
    if (!hasBoards || Number(stats.totalBudget) <= 0) return null;
    const remaining = stats.totalBudget - stats.totalExpenses;
    const isOver = remaining < 0;
    return (
      <View style={styles.gaugeCard}>
        <View style={styles.gaugeTitleRow}>
          <Text style={styles.gaugeTitle}>
            Monthly Target
          </Text>
          <Text style={isOver ? styles.gaugeOverText : styles.gaugeSafeText}>
            {isOver
              ? `Over by ${formatCurrency(Math.abs(remaining))}`
              : `Safe by ${formatCurrency(remaining)}`}
          </Text>
        </View>
        <View style={styles.gaugeTrack}>
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${budgetPercent}%`,
                backgroundColor: kinetic.gaugeColor(budgetPercent),
              },
            ]}
          />
        </View>
        <View style={styles.gaugeMeta}>
          <Text style={styles.gaugeMetaText}>
            {t("spent")}:{" "}
            <Text style={styles.gaugeMetaValue}>
              {formatCurrency(stats.totalExpenses)}
            </Text>
          </Text>
          <Text style={styles.gaugeMetaText}>
            Limit:{" "}
            <Text style={styles.gaugeMetaValue}>
              {formatCurrency(stats.totalBudget)}
            </Text>{" "}
            ({budgetPercent}%)
          </Text>
        </View>
      </View>
    );
  };

  const renderMonthlyBudgetPrompt = () => {
    const budgetSet =
      Number(userProfile?.default_board_budget) > 0 ||
      Number(stats.totalBudget) > 0;
    if (!hasBoards || budgetSet) return null;

    return (
      <View
        style={[
          styles.firstBoardCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={[styles.firstBoardIcon, { backgroundColor: theme.primaryMuted }]}>
          <MaterialCommunityIcons name="wallet-outline" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.firstBoardTitle, { color: theme.text }]}>
          {t("monthlyBudgetPromptTitle")}
        </Text>
        <Text style={[styles.firstBoardSubtitle, { color: theme.textSecondary }]}>
          {t("monthlyBudgetPromptSubtitle")}
        </Text>
        <TouchableOpacity
          style={[styles.firstBoardButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color={theme.white} />
          <Text style={[styles.firstBoardButtonText, { color: theme.white }]}>
            {t("setMonthlyBudgetInSettings")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFirstBoardPrompt = () => {
    if (hasBoards) return null;

    return (
      <View
        style={[
          styles.firstBoardCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={[styles.firstBoardIcon, { backgroundColor: theme.primaryMuted }]}>
          <MaterialCommunityIcons name="view-grid-plus" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.firstBoardTitle, { color: theme.text }]}>
          {t("firstBoardTitle")}
        </Text>
        <Text style={[styles.firstBoardSubtitle, { color: theme.textSecondary }]}>
          {t("firstBoardSubtitle")}
        </Text>
        <TouchableOpacity
          style={[styles.firstBoardButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("CreateExpenseBoard")}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={20} color={theme.white} />
          <Text style={[styles.firstBoardButtonText, { color: theme.white }]}>
            {t("createFirstBoard")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("ExpenseBoard")}
          style={styles.firstBoardLink}
        >
          <Text style={[styles.firstBoardLinkText, { color: theme.primary }]}>
            {t("joinWithCode")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const isCueHighlight = (index) => activeHighlight === `quickAction:${index}`;

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <QuickActionTile
        icon="view-grid-outline"
        label={t("boards")}
        color={theme.accent}
        highlighted={isCueHighlight(0)}
        onPress={() => navigation.navigate("ExpenseBoard")}
      />
      <QuickActionTile
        icon="plus-circle-outline"
        label={t("addExpense")}
        color={theme.primary}
        highlighted={isCueHighlight(1)}
        onPress={() => navigation.navigate("AddExpense")}
      />
      <QuickActionTile
        icon="tag-outline"
        label={t("categories")}
        color={theme.coral || theme.warning}
        highlighted={isCueHighlight(2)}
        onPress={() => navigation.navigate("Categories")}
      />
    </View>
  );

  // Design quick actions: New Board / Scan Bill (AI badge) / Nudge.
  // Add Bill lives in the row above (Add Expense tile, tour index 1).
  const renderDesignActions = () => (
    <View style={styles.designActions}>
      <TouchableOpacity
        style={styles.designAction}
        onPress={() => navigation.navigate("CreateExpenseBoard")}
        accessibilityRole="button"
        accessibilityLabel="New Board"
        testID="quick-action-new-board"
        activeOpacity={0.85}
      >
        <View style={[styles.designActionIcon, { backgroundColor: "#E8EEF3" }]}>
          <MaterialCommunityIcons name="folder-plus-outline" size={24} color={K.navy} />
        </View>
        <Text style={styles.designActionLabel}>New Board</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.designAction}
        onPress={() => navigation.navigate("AddExpense", { fromScan: true })}
        accessibilityRole="button"
        accessibilityLabel="Scan Bill"
        testID="quick-action-scan-bill"
        activeOpacity={0.85}
      >
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
        <View style={[styles.designActionIcon, { backgroundColor: "#FFF1E6" }]}>
          <MaterialCommunityIcons name="line-scan" size={24} color={K.coral} />
        </View>
        <Text style={styles.designActionLabel}>Scan Bill</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.designAction}
        onPress={handleNudge}
        accessibilityRole="button"
        accessibilityLabel="Nudge"
        testID="quick-action-nudge"
        activeOpacity={0.85}
      >
        <View style={[styles.designActionIcon, { backgroundColor: "#E7F8EE" }]}>
          <MaterialCommunityIcons name="bell-ring-outline" size={24} color={K.success} />
        </View>
        <Text style={styles.designActionLabel}>Nudge</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBoardsSection = () => {
    if (!hasBoards || boards.length === 0) return null;
    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Active Shared Boards
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("ExpenseBoard")}
            style={styles.seeAllButton}
            accessibilityRole="button"
            accessibilityLabel="View all"
          >
            <Text style={styles.seeAllText}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.boardsList}>
          {boards.slice(0, 3).map((board) => {
            const details = boardDetails[board.id];
            const participants = details?.participants || [];
            const myParticipant = participants.find(
              (participant) => participant.id === authUser?.id
            );
            const myShare = myParticipant
              ? (Number(myParticipant.balancePaise) || 0) / 100
              : 0;
            const boardTotal = Number(details?.totalExpenses ?? board.totalExpenses) || 0;
            const boardBudget = Number(details?.totalBudget ?? board.total_budget) || 0;
            const usage =
              boardBudget > 0 ? Math.round((boardTotal / boardBudget) * 100) : null;
            const boardSettlements = details?.settlements || [];
            const myDebt = boardSettlements.find(
              (settlement) => settlement.fromId === authUser?.id
            );
            const memberCount = Math.max(participants.length, 1);
            return (
              <BoardCard
                key={board.id}
                title={board.name}
                subtitle={
                  memberCount > 1
                    ? `${memberCount} ${t("members") || "members"}`
                     : "Personal board"
                }
                icon={board.board_icon || "💰"}
                yourShare={myShare}
                members={participants.map((participant) => ({
                  id: participant.id,
                  name: participant.name,
                }))}
                totalMembers={participants.length}
                budgetUsagePercent={usage}
                unsettledCount={
                  myDebt ? undefined : boardSettlements.length
                }
                settleLabel={
                  myDebt
                    ? `You pay ${myDebt.to} ${formatCurrency(myDebt.amount)}`
                    : null
                }
                onPress={() =>
                  navigation.navigate("ExpenseBoardDetails", {
                    boardId: board.id,
                    boardName: board.name,
                    totalExpenses: boardTotal,
                    totalBudget: boardBudget,
                    totalTransactions: board.totalTransactions,
                  })
                }
                onSettlePress={
                  myDebt ? () => paySettlement(myDebt, board.name) : undefined
                }
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderNotificationTestButtons = () => (
    <View style={styles.notificationTestContainer}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t("testNotifications")}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.notificationButtonsScroll}
      >
        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendPushNotification(
              "Test Notification",
              "This is a test notification"
            )
          }
        >
          <MaterialCommunityIcons name="bell" size={20} color={theme.primary} />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("basic")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendCreateExpenseBoardNotification({
              boardName: "Test Board",
              icon: "view-grid",
              iconColor: "#4CAF50",
            })
          }
        >
          <MaterialCommunityIcons
            name="view-grid"
            size={20}
            color={theme.success}
          />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("boardCreated")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendExpenseBoardInviteNotification({
              boardName: "Test Board",
              inviteeName: "John Doe",
              icon: "account-plus",
              iconColor: "#2196F3",
            })
          }
        >
          <MaterialCommunityIcons
            name="account-plus"
            size={20}
            color={theme.primary}
          />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("boardInvite")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendCreateExpenseNotification({
              boardName: "Test Board",
              icon: "cash",
              iconColor: "#FF9800",
              expenseName: "Test Expense",
              expenseAmount: 100,
            })
          }
        >
          <MaterialCommunityIcons name="cash" size={20} color={theme.warning} />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("expenseCreated")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendCreateCategoryNotification({
              boardName: "Test Board",
              icon: "tag",
              iconColor: "#9C27B0",
              categoryName: "Test Category",
            })
          }
        >
          <MaterialCommunityIcons name="tag" size={20} color={theme.primary} />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("categoryCreated")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendDeleteCategoryNotification({
              boardName: "Test Board",
              icon: "delete",
              iconColor: "#F44336",
              categoryName: "Test Category",
            })
          }
        >
          <MaterialCommunityIcons name="delete" size={20} color={theme.error} />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("deleteCategory")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendUpdateCategoryNotification({
              boardName: "Test Board",
              icon: "pencil",
              iconColor: "#2196F3",
              categoryName: "Test Category",
            })
          }
        >
          <MaterialCommunityIcons
            name="pencil"
            size={20}
            color={theme.primary}
          />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("updateCategory")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendExpenseOverBudgetNotification({
              boardName: "Test Board",
              icon: "alert",
              iconColor: "#F44336",
              budgetAmount: 1000,
              expenseAmount: 1200,
            })
          }
        >
          <MaterialCommunityIcons name="alert" size={20} color={theme.error} />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("overBudget")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.devNotificationButton, { backgroundColor: theme.card }]}
          onPress={() =>
            sendExpenseDeletedNotification({
              boardName: "Test Board",
              icon: "delete",
              iconColor: "#F44336",
              expenseName: "Test Expense",
              expenseAmount: 100,
            })
          }
        >
          <MaterialCommunityIcons name="delete" size={20} color={theme.error} />
          <Text style={[styles.notificationButtonText, { color: theme.text }]}>
            {t("expenseDeleted")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderTransactionsSection = () => (
    <View style={styles.transactionsBlock}>
      <HomeSectionHeader
        title={t("recentTransactions")}
        subtitle={t("recentTransactionsSubtitle")}
        trailing={
          expenses.length > 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("Expense")}
              style={styles.seeAllButton}
            >
              <Text style={[styles.seeAllText, { color: theme.primary }]}>
                {t("seeAll")}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <ExpenseList
        expenses={expenses.slice(0, recentLimit)}
        onSeeAllPress={() => navigation.navigate("Expense")}
        onDeletePress={handleDeletePress}
        onExpensePress={(expense) => navigation.navigate("ExpenseDetails", { expense })}
        showHeader={false}
        showAllButton={false}
        showEmptyState={true}
        navigation={navigation}
        embedded={true}
        compact={Platform.OS === "android"}
        showInlineAds={true}
        inlineAdMode="single"
      />
    </View>
  );

  const renderHeaderTrailing = () => (
    <View style={styles.headerTrailing}>
      <TouchableOpacity
        onPress={() => navigation.navigate("Notification")}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        style={[
          styles.headerIconButton,
          {
            backgroundColor: "rgba(255,255,255,0.12)",
            borderColor: "transparent",
          },
        ]}
      >
        {unreadCount > 0 && (
          <View
            style={[
              styles.notificationBadge,
              { backgroundColor: theme.error },
            ]}
          >
            <Text style={styles.notificationCount}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
        <MaterialCommunityIcons
          name="bell-outline"
          size={20}
          color={theme.headerText || "#FFFFFF"}
        />
      </TouchableOpacity>
      <ThemeToggle tone="onDark" />
      <PlanBadge
        tone="onDark"
        onPress={
          paymentsEnabled && !subscriptionLoading
            ? () => navigation.navigate("Paywall")
            : undefined
        }
      />
    </View>
  );

  const renderAvatar = () => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Profile", { tabRoot: false })}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      style={styles.avatarCircle}
    >
      <Text style={styles.avatarText}>
        {(firstName || "?").trim().charAt(0).toUpperCase()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenLayout navigation={navigation} footerRoute={null} showAdBanner={false}>
        <AnimatedLoader context="dashboard" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      footerRoute={null}
      showAdBanner={false}
      header={
        <AppTabHeader
          compact
          title={headerTitle}
          subtitle={headerSubtitle}
          leading={renderAvatar()}
          onTitlePress={() => navigation.navigate("Profile", { tabRoot: false })}
          trailing={renderHeaderTrailing()}
        />
      }
    >
      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <AdSupportedAccessBanner />

        <View style={styles.sections}>
          {renderGreeting()}
          {renderFirstBoardPrompt()}
          {renderMonthlyBudgetPrompt()}
          {hasBoards ? (
            <HeroBalanceCard
              netPosition={netPosition}
              owedToYou={owedToYou}
              youOwe={youOwe}
              formatAmount={formatCurrency}
              onSmartSettle={payableSettlement ? handleSmartSettle : undefined}
            />
          ) : null}
          {userSettlements.length > 0 ? (
            <SettlementActionModule
              greedySummary={
                userSettlements.length > 1
                  ? `Greedy AI collapses ${userSettlements.length} dues into direct UPI transfers`
                  : null
              }
              greedyCount={userSettlements.length}
              onRequestUpi={payableSettlement ? handleSmartSettle : undefined}
              onWhatsappNudge={handleNudge}
            />
          ) : null}
          {renderQuickActions()}
          {renderDesignActions()}
          {renderMonthlyBudgetGauge()}
          {renderBoardsSection()}
          <SponsoredAdSlot>
            <HomeInlineAd />
          </SponsoredAdSlot>
          {__DEV__ ? renderNotificationTestButtons() : null}
          {renderTransactionsSection()}
          <HomeBrowseLink
            count={moreExpenseCount}
            onPress={() => navigation.navigate("Expense")}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
