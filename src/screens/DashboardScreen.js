import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../config/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { expenseService } from "../services/expenseService";
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
import { LinearGradient } from "expo-linear-gradient";
import { QuickActionTile } from "../components/ui/UIKit";
import { styles } from "./dashboard/dashboardStyles";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";


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
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalExpenses: 0,
    remainingBudget: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const { greeting, subtitle: dashboardSubtitle } = getLocalizedGreeting(t);
  const firstName = getFirstName(userProfile?.full_name, t("guest"));
  // Keep the time-of-day greeting as the hero title (always visible).
  const headerTitle = greeting;
  const headerSubtitle = userProfile?.full_name
    ? `${firstName} · ${dashboardSubtitle}`
    : dashboardSubtitle;
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

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

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
      await fetchUnreadCount();
    });
    return stop;
  }, [fetchDashboardDataState, fetchUnreadCount]);

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
      fetchUnreadCount();
    }, [loadProfile, fetchDashboardDataState, fetchUnreadCount])
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

  // useEffect(() => {
  //   const subscription = realTimeSync.subscribeToNotifications(() => {
  //     fetchUnreadCount();
  //   });

  //   return () => {
  //     subscription.unsubscribe();
  //   };
  // }, []);

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
      fetchUnreadCount(),
    ]);
    setRefreshing(false);
  }, [loadProfile, fetchDashboardDataState, fetchUnreadCount]);

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
  // const fetchDashboardData = async () => {
  //   try {
  //     //setLoading(true);

  //     // Fetch expense boards
  //     const expenseBoards = await expenseBoardService.getExpenseBoards();
  //     setHasBoards(expenseBoards.length > 0);

  //     // Calculate total budget and expenses from boards
  //     const totalBudget = expenseBoards.reduce(
  //       (sum, board) => sum + (board.total_budget || 0),
  //       0
  //     );
  //     const totalExpenses = expenseBoards.reduce(
  //       (sum, board) => sum + (board.totalExpenses || 0),
  //       0
  //     );
  //     remainingBudget = totalBudget - totalExpenses;

  //     // Update stats
  //     setStats({
  //       totalBudget,
  //       totalExpenses,
  //       remainingBudget,
  //     });

  //     // Fetch recent transactions
  //     const { data: transactionsData, error: transactionsError } =
  //       await dashboardService.getRecentTransactions();

  //     console.log("transactionsData", transactionsData);

  //     if (transactionsError) {
  //       console.log("Error fetching transactions:", transactionsError);
  //     }

  //     setExpenses(transactionsData);
  //   } catch (error) {
  //     console.error("Error fetching dashboard data:", error.message);
  //     showToast.error("Failed to load dashboard data");
  //     setExpenses([]);
  //   } finally {
  //     // setLoading(false);
  //   }
  // };

  const budgetPercent = Math.min(
    100,
    Math.round((stats.totalExpenses / (stats.totalBudget || 1)) * 100)
  );

  const renderBalanceCard = () => (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.balanceCard}
    >
      <View style={styles.balanceTopRow}>
        <View>
          <Text style={styles.balanceEyebrow}>{t("totalBudget")}</Text>
          <Text style={styles.balanceHero}>{formatCurrency(stats.totalBudget)}</Text>
        </View>
        <View style={styles.balanceStatPill}>
          <Text style={styles.balancePillLabel}>{t("remaining")}</Text>
          <Text style={styles.balancePillValue}>
            {formatCurrency(stats.remainingBudget)}
          </Text>
        </View>
      </View>

      <View style={styles.balanceStatsRow}>
        <View style={styles.balanceMiniStat}>
          <MaterialCommunityIcons name="cash-minus" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.balanceMiniLabel}>{t("spent")}</Text>
          <Text style={styles.balanceMiniValue}>{formatCurrency(stats.totalExpenses)}</Text>
        </View>
        <View style={styles.balanceMiniStat}>
          <MaterialCommunityIcons name="chart-donut" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.balanceMiniLabel}>{t("budgetUsage")}</Text>
          <Text style={styles.balanceMiniValue}>{budgetPercent}%</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${budgetPercent}%`,
              backgroundColor:
                budgetPercent >= 90 ? theme.coral || "#FB923C" : theme.white,
            },
          ]}
        />
      </View>
    </LinearGradient>
  );

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

  if (loading) {
    return (
      <ScreenLayout navigation={navigation} footerRoute="Home" showAdBanner={false}>
        <AnimatedLoader context="dashboard" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      footerRoute="Home"
      showAdBanner={false}
      header={
        <AppTabHeader
          compact
          title={headerTitle}
          subtitle={headerSubtitle}
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
          {renderFirstBoardPrompt()}
          {renderMonthlyBudgetPrompt()}
          {hasBoards ? renderBalanceCard() : null}
          <HomeInlineAd />
          {renderQuickActions()}
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

