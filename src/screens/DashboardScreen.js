import React, { useEffect, useState, useRef, useCallback } from "react";
import { shadowStyle } from "../utils/platformStyles";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../config/supabase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { expenseBoardService } from "../services/expenseBoardService";
import { expenseService } from "../services/expenseService";
import { dashboardService } from "../services/dashboardService";
import ThemeToggle from "../components/ThemeToggle";
import ScreenLayout from "../components/ScreenLayout";
import ExpenseList from "../components/ExpenseList";
import BrandLogo from "../components/BrandLogo";
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
import BalloonIllustration from "../components/BalloonIllustration";
import { realTimeSync } from "../services/realTimeSync";
import {
  sendCreateCategoryNotification,
  sendCreateExpenseBoardNotification,
  sendCreateExpenseNotification,
  sendDeleteCategoryNotification,
  sendExpenseBoardDeletedNotification,
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
import { layout, radii, spacing, typography } from "../theme/tokens";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";

const { width, height } = Dimensions.get("window");
const HOME_SECTION_GAP = spacing.xl;

export const DashboardScreen = ({ navigation }) => {
  const { startTour, activeHighlight, isActive: cueActive } = useAppCue();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { currency } = useAppSettings();
  const { paymentsEnabled, loading: subscriptionLoading } = useSubscription();
  const scrollBottomPadding = useFooterScrollPadding(0, false);
  const recentLimit = Platform.OS === "android" ? 5 : 4;
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
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
  const pushToken = userProfile?.expo_push_token; // Replace with actual token
  const message = "Hello, you have a new notification!";

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
    }, [navigation])
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
  }, [loading]);

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
  let remainingBudget;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  exploreText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
  },
  sections: {
    gap: HOME_SECTION_GAP,
    marginTop: spacing.sm,
  },
  transactionsBlock: {
    gap: spacing.sm,
  },
  firstBoardCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  firstBoardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  firstBoardTitle: {
    ...typography.h3,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  firstBoardSubtitle: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  firstBoardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    width: "100%",
    justifyContent: "center",
  },
  firstBoardButtonText: {
    ...typography.bodyMedium,
    fontWeight: "700",
  },
  firstBoardLink: {
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  firstBoardLinkText: {
    ...typography.caption,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  headerTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceCard: {
    padding: Platform.OS === "android" ? spacing.lg : spacing.xl,
    borderRadius: radii.xl,
    ...shadowStyle(6),
  },
  balanceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Platform.OS === "android" ? spacing.md : spacing.lg,
  },
  balanceEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  balanceHero: {
    color: "#FFFFFF",
    fontSize: Platform.OS === "android" ? 26 : 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  balanceStatPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "flex-end",
  },
  balancePillLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "600",
  },
  balancePillValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  balanceStatsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: Platform.OS === "android" ? spacing.md : spacing.lg,
  },
  balanceMiniStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  balanceMiniLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "500",
  },
  balanceMiniValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  seeAllButton: {
    padding: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  notificationTestContainer: {
    marginBottom: spacing.sm,
  },
  notificationButtonsScroll: {
    marginTop: 10,
  },
  devNotificationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    ...shadowStyle(3),
  },
  notificationButtonText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "500",
  },
});
