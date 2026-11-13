import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { formatCurrency } from "../utils/formatters";
import { fetchExpenseTrends } from "../services/analyticsService";
import { expenseBoardService } from "../services/expenseBoardService";
import { exportAndShare } from "../services/exportService";
import { useAdPolicy } from "../context/AdPolicyContext";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { shouldShowAnalyticsPeriodAd } from "../config/admob";
import { useTranslation } from "../hooks/useTranslation";
import { useSubscription } from "../context/SubscriptionContext";
import { FEATURES } from "../config/subscriptionPlans";
import InlineListAd from "../components/InlineListAd";
import AdBanner from "../components/AdBanner";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";
import { kinetic } from "../theme/tokens";
import { computeExpenseStreak, toDayKey } from "../utils/streak";

const K = kinetic.colors;
const KT = kinetic.typography;
const DONUT_COLORS = [
  K.coral,
  K.navy,
  K.upiBlue,
  "#8B5CF6",
  K.success,
  K.warning,
];
const PERIOD_WORD = { week: "week", month: "month", year: "year", all: "period" };

const TIME_PERIOD_KEYS = {
  week: "thisWeek",
  month: "thisMonth",
  year: "thisYear",
  all: "allTime",
};
const TIME_PERIODS = [
  { id: "week", icon: "calendar-week" },
  { id: "month", icon: "calendar-month" },
  { id: "year", icon: "calendar-range" },
  { id: "all", icon: "calendar-clock" },
];

// GLOBAL analytics: spending trends, categories and period comparisons
// across all boards (via analyticsService.fetchExpenseTrends). Not a
// duplicate of AnalysisScreen, which is per-board settlements.
// Layout authority: Stitch analyticsscreen export (hero, donut, insights,
// top boards). Palette: navy #003D66 / coral #F97316.
export const AnalyticsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { showBannerAds } = useAdPolicy();
  const { isAdFree } = useAdEntitlement();
  const { hasFeature } = useSubscription();
  const scrollBottomPadding = useFooterScrollPadding(0, true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [exporting, setExporting] = useState(false);
  const [boardSummary, setBoardSummary] = useState(null);
  const [series, setSeries] = useState(null);
  const [streakDays, setStreakDays] = useState(0);
  const [streakDots, setStreakDots] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalExpenses: 0,
    averageExpense: 0,
    topCategories: [],
    insights: [],
    stats: {
      highestSpending: 0,
      lowestSpending: 0,
      totalTransactions: 0,
    },
  });

  const fetchAnalytics = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        if (!isRefresh) setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const trends = await fetchExpenseTrends(user.id, selectedPeriod);
        const statistics = trends.statistics;
        const topCategory = statistics?.categoryBreakdown?.[0];
        const analyticsData = {
          totalExpenses: statistics.totalAmount,
          averageExpense: statistics?.averageAmountPerDay,
          stats: {
            highestSpending: statistics.highestAmount,
            lowestSpending: statistics.lowestAmount,
            totalTransactions: statistics.totalCount,
            highestCategory: topCategory?.name,
            highestCategoryPercentage: topCategory?.percentage,
            previousPeriod: {
              totalAmount: statistics.previousPeriod?.totalAmount || 0,
              percentageChange:
                statistics.previousPeriod?.percentageChange || 0,
            },
          },
          topCategories: statistics?.categoryBreakdown || [],
          insights: [
            {
              title: `Spending ${
                statistics.previousPeriod?.percentageChange >= 0
                  ? "Increased"
                  : "Decreased"
              }`,
              description: `Your spending ${
                statistics.previousPeriod?.percentageChange >= 0
                  ? "increased"
                  : "decreased"
              } by ${Math.abs(
                statistics.previousPeriod?.percentageChange || 0
              )}% compared to last ${selectedPeriod}`,
              icon:
                statistics.previousPeriod?.percentageChange >= 0
                  ? "trending-up"
                  : "trending-down",
              color:
                statistics.previousPeriod?.percentageChange >= 0
                  ? K.textNegative
                  : K.textPositive,
              bg:
                statistics.previousPeriod?.percentageChange >= 0
                  ? "#FEF2F2"
                  : K.tintGreen,
            },
            {
              title: "Top Category",
              description: (() => {
                const names = (statistics?.categoryBreakdown || [])
                  .slice(0, 3)
                  .map((c) => c?.name)
                  .filter(Boolean);
                if (names.length === 0)
                  return "Add expenses to see top categories.";
                if (names.length === 1)
                  return `${names[0]} is your top spending category.`;
                const last = names.pop();
                return `${names.join(", ")} and ${last} are your top spending categories.`;
              })(),
              icon: "tag-multiple",
              color: K.navy,
              bg: K.tintBlue,
            },
            {
              title: "Savings Opportunity",
              description: topCategory
                ? `${topCategory.name} is ${topCategory.percentage}% of your spending — trimming it moves the total most.`
                : "Track spending to find savings opportunities.",
              icon: "piggy-bank",
              color: K.coralDark,
              bg: K.tintAmber,
            },
          ],
        };

        setAnalytics(analyticsData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setErrorMessage(error?.message || "Couldn't load analytics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedPeriod]
  );

  // Cross-board balances + top spenders, from the real per-board
  // settlements (expenseBoardService). Period-independent: load once.
  // Guarded: the service methods may be absent in test doubles.
  const fetchBoardBalances = useCallback(async () => {
    try {
      if (
        typeof expenseBoardService.getExpenseBoards !== "function" ||
        typeof expenseBoardService.getExpenseBoardsByID !== "function"
      ) {
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const boards = await expenseBoardService.getExpenseBoards();
      if (!Array.isArray(boards) || boards.length === 0) {
        setBoardSummary({
          youOwe: 0,
          youLent: 0,
          settledCount: 0,
          topSpenders: [],
          topBoards: [],
        });
        return;
      }
      let youOwe = 0;
      let youLent = 0;
      let settledCount = 0;
      const spentBy = new Map();
      const boardRows = [];
      for (const board of boards) {
        try {
          const detail = await expenseBoardService.getExpenseBoardsByID(
            board.id
          );
          if (!detail || !Array.isArray(detail.settlements)) continue;
          const myRow = (detail.participants || []).find(
            (p) => p.id === user.id
          );
          boardRows.push({
            id: board.id,
            name: board.name,
            total: Number(detail.totalExpenses || 0),
            members: detail.participants?.length || 0,
            mySpent: Number(myRow?.spent || 0),
          });
          for (const s of detail.settlements) {
            if (s.fromId === user.id) youOwe += Number(s.amount || 0);
            if (s.toId === user.id) youLent += Number(s.amount || 0);
          }
          if (
            Number(detail.totalExpenses || 0) > 0 &&
            detail.settlements.length === 0
          ) {
            settledCount += 1;
          }
          for (const p of detail.participants || []) {
            const cur = spentBy.get(p.id) || {
              id: p.id,
              name: p.name,
              spent: 0,
            };
            cur.spent += Number(p.spent || 0);
            spentBy.set(p.id, cur);
          }
        } catch {
          // One bad board must not kill the whole summary.
        }
      }
      const totalSpentAcross = [...spentBy.values()].reduce(
        (sum, p) => sum + p.spent,
        0
      );
      const topSpenders = [...spentBy.values()]
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5)
        .map((p) => ({
          ...p,
          share:
            totalSpentAcross > 0
              ? Math.round((p.spent / totalSpentAcross) * 100)
              : 0,
        }));
      const topBoards = boardRows
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);
      setBoardSummary({ youOwe, youLent, settledCount, topSpenders, topBoards });
    } catch {
      // Board summary is additive; the trends screen works without it.
    }
  }, []);

  // Real spending-over-time bars from the user's expenses. Buckets:
  // daily for week/month, monthly for year/all (last 12 months).
  // Any failure hides the chart rather than faking bars.
  const fetchSeries = useCallback(async (period) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date();
      const monthly = period === "year" || period === "all";
      const start = new Date(now);
      if (monthly) start.setMonth(start.getMonth() - 12);
      else if (period === "week") start.setDate(start.getDate() - 7);
      else start.setDate(start.getDate() - 30);

      const { data: owned } = await supabase
        .from("expense_boards")
        .select("id")
        .eq("created_by", user.id);
      const { data: shared } = await supabase
        .from("shared_users")
        .select("board_id")
        .eq("user_id", user.id)
        .eq("is_accepted", true);
      const boardIds = [
        ...(owned || []).map((b) => b.id),
        ...(shared || []).map((s) => s.board_id),
      ];
      if (boardIds.length === 0) {
        setSeries(null);
        setStreakDays(0);
        setStreakDots([]);
        return;
      }
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, date")
        .in("board_id", boardIds)
        .gte("date", start.toISOString())
        .lte("date", now.toISOString())
        .order("date", { ascending: true });
      if (error) throw error;
      const rows = data || [];

      setStreakDays(computeExpenseStreak(rows.map((r) => r.date)));
      const daySet = new Set(
        rows.map((r) => toDayKey(r.date)).filter(Boolean)
      );
      const dots = [];
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dots.push({ key: toDayKey(d), active: daySet.has(toDayKey(d)) });
      }
      setStreakDots(dots);

      let buckets = [];
      if (monthly) {
        const months = [];
        for (let i = 11; i >= 0; i -= 1) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({
            key: `${d.getFullYear()}-${d.getMonth()}`,
            label: d.toLocaleDateString("en-US", { month: "short" }),
            value: 0,
          });
        }
        for (const row of rows) {
          const d = new Date(row.date);
          if (Number.isNaN(d.getTime())) continue;
          const bucket = months.find(
            (m) => m.key === `${d.getFullYear()}-${d.getMonth()}`
          );
          if (bucket) bucket.value += Number(row.amount || 0);
        }
        buckets = months;
      } else {
        const dayCount = period === "week" ? 7 : 30;
        const days = [];
        for (let i = dayCount - 1; i >= 0; i -= 1) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          days.push({
            key: toDayKey(d),
            label:
              period === "week"
                ? d.toLocaleDateString("en-US", { weekday: "short" })
                : String(d.getDate()),
            value: 0,
          });
        }
        for (const row of rows) {
          const bucket = days.find((b) => b.key === toDayKey(row.date));
          if (bucket) bucket.value += Number(row.amount || 0);
        }
        buckets = days;
      }
      setSeries({ buckets, monthly, period });
    } catch {
      setSeries(null);
      setStreakDays(0);
      setStreakDots([]);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
    fetchBoardBalances();
    fetchSeries(selectedPeriod);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchBoardBalances();
  }, [fetchBoardBalances]);

  useEffect(() => {
    fetchSeries(selectedPeriod);
  }, [selectedPeriod, fetchSeries]);

  const handleExport = async () => {
    if (!hasFeature(FEATURES.EXPORT_DATA)) {
      navigation.navigate("Paywall", { feature: FEATURES.EXPORT_DATA });
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      await exportAndShare("csv", "Export Trivense Data");
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert(t("error"), "Couldn't export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const pctChange = analytics.stats.previousPeriod?.percentageChange || 0;
  const prevTotal = analytics.stats.previousPeriod?.totalAmount || 0;
  const isUp = pctChange >= 0;
  const showPeriodAd =
    showBannerAds && shouldShowAnalyticsPeriodAd(isAdFree, selectedPeriod);
  const topCategory = analytics.topCategories[0];

  const initials = (name) =>
    String(name || "M")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

  const renderPeriodControl = () => (
    <View style={styles.segmented}>
      {TIME_PERIODS.map((period) => {
        const active = selectedPeriod === period.id;
        return (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.segmentedBtn,
              active ? styles.segmentedBtnActive : null,
            ]}
            onPress={() => setSelectedPeriod(period.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(TIME_PERIOD_KEYS[period.id] || period.id)}
          >
            <Text
              style={[
                styles.segmentedBtnText,
                active ? styles.segmentedBtnTextActive : null,
              ]}
            >
              {t(TIME_PERIOD_KEYS[period.id] || period.id)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderHeroCard = () => (
    <LinearGradient
      colors={K.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroEyebrow}>Total spent</Text>
          <Text style={styles.heroAmount}>
            {formatCurrency(analytics.totalExpenses)}
          </Text>
        </View>
        {prevTotal > 0 ? (
          <View
            style={[
              styles.trendPill,
              { backgroundColor: "rgba(255,255,255,0.18)" },
            ]}
          >
            <MaterialCommunityIcons
              name={isUp ? "trending-up" : "trending-down"}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.trendPillText}>
              {Math.abs(pctChange)}% vs last {PERIOD_WORD[selectedPeriod]}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.miniStatsRow}>
        {[
          {
            label: "Daily Average",
            value: `${formatCurrency(analytics.averageExpense)}/day`,
          },
          {
            label: "Highest",
            value: formatCurrency(analytics.stats.highestSpending),
          },
          {
            label: "Txns",
            value: String(analytics.stats.totalTransactions),
          },
        ].map((item) => (
          <View key={item.label} style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>{item.label}</Text>
            <Text
              style={styles.miniStatValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
      {streakDays > 0 ? (
        <View style={styles.streakRow}>
          <Text style={styles.streakText}>
            {streakDays}-day logging streak
          </Text>
          <View style={styles.streakDots}>
            {streakDots.map((dot) => (
              <View
                key={dot.key}
                style={[
                  styles.streakDot,
                  dot.active ? styles.streakDotActive : null,
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );

  const renderSummaryCards = () => {
    const cards = [
      {
        label: "Total Spent",
        value: formatCurrency(analytics.totalExpenses),
        icon: "cash-multiple",
        color: K.navy,
        bg: K.tintBlue,
      },
    ];
    if (boardSummary) {
      cards.push(
        {
          label: "You Owe",
          value: formatCurrency(boardSummary.youOwe),
          icon: "arrow-up-circle",
          color: K.textNegative,
          bg: "#FEF2F2",
        },
        {
          label: "You Lent",
          value: formatCurrency(boardSummary.youLent),
          icon: "arrow-down-circle",
          color: K.textPositive,
          bg: K.tintGreen,
        },
        {
          label: "Settled",
          value: `${boardSummary.settledCount} board${boardSummary.settledCount === 1 ? "" : "s"}`,
          icon: "check-circle",
          color: K.textPositive,
          bg: K.tintGreen,
        }
      );
    }
    return (
      <View style={styles.summaryGrid}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={[
              styles.summaryCard,
              cards.length === 1 ? styles.summaryCardFull : null,
            ]}
          >
            <View style={[styles.summaryIcon, { backgroundColor: card.bg }]}>
              <MaterialCommunityIcons
                name={card.icon}
                size={20}
                color={card.color}
              />
            </View>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text
              style={styles.summaryValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {card.value}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderBarChart = () => {
    if (!series || series.buckets.length === 0) return null;
    const maxBar =
      series.buckets.reduce((max, b) => Math.max(max, b.value), 0) || 0;
    if (maxBar <= 0) return null;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Spending over time</Text>
          <Text style={styles.cardHint}>
            {series.monthly ? "Last 12 months" : `Last ${series.buckets.length} days`}
          </Text>
        </View>
        <View style={styles.barChart}>
          {series.buckets.map((bucket, index) => (
            <View key={bucket.key} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (bucket.value / maxBar) * 110),
                    backgroundColor:
                      bucket.value === maxBar ? K.coral : K.navy,
                  },
                ]}
              />
              <Text style={styles.barLabel}>
                {series.monthly || series.buckets.length <= 7
                  ? bucket.label
                  : index % 5 === 0 || index === series.buckets.length - 1
                    ? bucket.label
                    : ""}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCategoryBreakdown = () => {
    if (analytics.topCategories.length === 0) return null;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = analytics.topCategories.map((category, index) => {
      const pct = Number(category.percentage || 0) / 100;
      const seg = {
        key: category.name,
        dash: pct * circumference,
        offset,
        color: category.color || DONUT_COLORS[index % DONUT_COLORS.length],
      };
      offset -= pct * circumference;
      return seg;
    });
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Category Breakdown</Text>
          <Text style={styles.cardHint}>
            {analytics.topCategories.length} Active Categor
            {analytics.topCategories.length === 1 ? "y" : "ies"}
          </Text>
        </View>
        <View style={styles.donutWrap}>
          <Svg width={176} height={176} viewBox="0 0 100 100">
            <Circle
              cx="50"
              cy="50"
              r={radius}
              stroke={K.subtle}
              strokeWidth={12}
              fill="none"
            />
            {segments.map((seg) => (
              <Circle
                key={seg.key}
                cx="50"
                cy="50"
                r={radius}
                stroke={seg.color}
                strokeWidth={12}
                fill="none"
                strokeDasharray={`${Math.max(seg.dash, 0)} ${circumference}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            ))}
          </Svg>
          <View style={styles.donutCenter}>
            <Text style={styles.donutCenterLabel}>Top Spent</Text>
            <Text style={styles.donutCenterValue}>
              {topCategory ? `${topCategory.percentage}%` : "—"}
            </Text>
            <Text style={styles.donutCenterName} numberOfLines={1}>
              {topCategory ? topCategory.name : ""}
            </Text>
          </View>
        </View>
        {analytics.topCategories.map((category, index) => (
          <View key={category.name} style={styles.categoryRow}>
            <View
              style={[
                styles.categoryIcon,
                {
                  backgroundColor: `${
                    category.color || DONUT_COLORS[index % DONUT_COLORS.length]
                  }1A`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={category.icon || "tag"}
                size={20}
                color={
                  category.color || DONUT_COLORS[index % DONUT_COLORS.length]
                }
              />
            </View>
            <View style={styles.categoryInfo}>
              <View style={styles.categoryTop}>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {category.name}
                </Text>
                <Text
                  style={[
                    styles.categoryPct,
                    {
                      color:
                        category.color ||
                        DONUT_COLORS[index % DONUT_COLORS.length],
                    },
                  ]}
                >
                  {category.percentage}%
                </Text>
              </View>
              <Text style={styles.categoryAmount}>
                {formatCurrency(category.amount)} · {category.count} txns
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor:
                        category.color ||
                        DONUT_COLORS[index % DONUT_COLORS.length],
                      width: `${Math.min(category.percentage || 0, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderInsights = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kinetic Insights</Text>
      {analytics.insights.map((insight, index) => (
        <View key={index} style={styles.insightCard}>
          <View
            style={[styles.insightIcon, { backgroundColor: insight.bg }]}
          >
            <MaterialCommunityIcons
              name={insight.icon}
              size={22}
              color={insight.color}
            />
          </View>
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightDesc}>{insight.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderTopSpenders = () => {
    if (!boardSummary || boardSummary.topSpenders.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Spenders</Text>
        {boardSummary.topSpenders.map((spender, index) => (
          <View key={spender.id} style={styles.spenderRow}>
            <Text style={styles.spenderRank}>{index + 1}</Text>
            <View style={styles.spenderAvatar}>
              <Text style={styles.spenderAvatarText}>
                {initials(spender.name)}
              </Text>
            </View>
            <View style={styles.spenderInfo}>
              <Text style={styles.spenderName} numberOfLines={1}>
                {spender.name}
              </Text>
              <Text style={styles.spenderShare}>
                {spender.share}% of board spending
              </Text>
            </View>
            <Text style={styles.spenderAmount}>
              {formatCurrency(spender.spent)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTopBoards = () => {
    if (!boardSummary || boardSummary.topBoards.length === 0) return null;
    const totalAll = boardSummary.topBoards.reduce(
      (sum, b) => sum + b.total,
      0
    );
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Top Shared Boards</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("ExpenseBoard")}
            accessibilityRole="button"
            accessibilityLabel="See all boards"
          >
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {boardSummary.topBoards.map((board) => (
          <TouchableOpacity
            key={board.id}
            style={styles.boardCard}
            onPress={() =>
              navigation.navigate("Analysis", { boardId: board.id })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${board.name} settlements`}
          >
            <View style={styles.boardCardTop}>
              <View style={styles.boardCardIcon}>
                <MaterialCommunityIcons
                  name="folder"
                  size={20}
                  color={K.navy}
                />
              </View>
              <View style={styles.boardCardInfo}>
                <Text style={styles.boardCardName} numberOfLines={1}>
                  {board.name}
                </Text>
                <Text style={styles.boardCardMeta}>
                  {board.members} Member{board.members === 1 ? "" : "s"}
                </Text>
              </View>
              <View style={styles.boardCardRight}>
                <Text style={styles.boardCardTotal}>
                  {formatCurrency(board.total)}
                </Text>
                <Text style={styles.boardCardYou}>
                  You: {formatCurrency(board.mySpent)}
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: K.coral,
                    width: `${totalAll > 0 ? Math.min((board.total / totalAll) * 100, 100) : 0}%`,
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScreenLayout
      navigation={navigation}
      footerRoute={null}
      contentStyle={{ backgroundColor: K.canvas }}
      header={
        <Header
          title={t("analytics")}
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("Dashboard");
          }}
        />
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: scrollBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.topRow}>
          <Text style={styles.topRowLabel}>
            {t(TIME_PERIOD_KEYS[selectedPeriod])}
          </Text>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExport}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Export report"
            testID="analytics-export-report"
          >
            <MaterialCommunityIcons
              name="file-download-outline"
              size={16}
              color={K.coralDark}
            />
            <Text style={styles.exportBtnText}>
              {exporting ? "Exporting…" : "Export"}
            </Text>
            {!hasFeature(FEATURES.EXPORT_DATA) ? (
              <View style={styles.proTag}>
                <Text style={styles.proTagText}>Pro</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        {renderPeriodControl()}
        {showPeriodAd ? (
          <InlineListAd style={{ marginBottom: 12 }} />
        ) : null}
        {loading && !refreshing ? (
          <AnimatedLoader context="analytics" compact />
        ) : errorMessage ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={K.danger}
            />
            <Text style={[styles.emptyText, { color: K.textPrimary }]}>
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchAnalytics()}
              accessibilityRole="button"
              accessibilityLabel={t("retry") || "Retry"}
            >
              <Text style={styles.retryBtnText}>{t("retry") || "Retry"}</Text>
            </TouchableOpacity>
          </View>
        ) : analytics.totalExpenses === 0 ? (
          <View style={styles.centered}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={36}
                color={K.navy}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: K.textPrimary }]}>
              No data yet
            </Text>
            <Text style={[styles.emptyText, { color: K.textSecondary }]}>
              {t("noExpenseDataForPeriod")}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { marginTop: 16 }]}
              onPress={() => navigation.navigate("AddExpense")}
              accessibilityRole="button"
              accessibilityLabel={t("addExpenseCta")}
            >
              <Text style={styles.retryBtnText}>{t("addExpenseCta")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderHeroCard()}
            {renderSummaryCards()}
            {renderBarChart()}
            {renderCategoryBreakdown()}
            {renderInsights()}
            {renderTopSpenders()}
            {renderTopBoards()}
          </>
        )}
      </ScrollView>
      <AdBanner />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    minHeight: 44,
  },
  topRowLabel: {
    ...KT.headingMedium,
    color: K.textPrimary,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 12,
    minHeight: 36,
    gap: 4,
    ...kinetic.shadows.card,
  },
  exportBtnText: {
    ...KT.headingSmall,
    color: K.navy,
  },
  proTag: {
    backgroundColor: K.coral,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: K.textInverse,
    textTransform: "uppercase",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: K.subtle,
    borderRadius: kinetic.radii.full,
    padding: 4,
    marginBottom: 12,
  },
  segmentedBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    borderRadius: kinetic.radii.full,
  },
  segmentedBtnActive: {
    backgroundColor: K.navy,
    ...kinetic.shadows.card,
  },
  segmentedBtnText: {
    ...KT.caption,
    fontSize: 13,
    color: K.textSecondary,
  },
  segmentedBtnTextActive: {
    color: K.textInverse,
    fontFamily: kinetic.fonts.interBold,
  },
  heroCard: {
    borderRadius: kinetic.radii.xl,
    padding: 20,
    marginBottom: 12,
    ...kinetic.shadows.elevated,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.75)",
    ...KT.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroAmount: {
    ...KT.displayLarge,
    color: K.textInverse,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: kinetic.radii.full,
  },
  trendPillText: {
    color: K.textInverse,
    ...KT.captionBold,
    fontSize: 12,
  },
  miniStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: kinetic.radii.md,
    padding: 12,
  },
  miniStatLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  miniStatValue: {
    color: K.textInverse,
    ...KT.headingSmall,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: kinetic.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  streakText: {
    ...KT.headingSmall,
    color: K.textInverse,
  },
  streakDots: {
    flexDirection: "row",
    gap: 6,
  },
  streakDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  streakDotActive: {
    backgroundColor: K.coral,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 14,
    marginBottom: 8,
    ...kinetic.shadows.card,
  },
  summaryCardFull: {
    width: "100%",
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    ...KT.caption,
    color: K.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    ...KT.headingMedium,
    color: K.textPrimary,
  },
  card: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    marginBottom: 12,
    ...kinetic.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    ...KT.headingMedium,
    color: K.textPrimary,
  },
  cardHint: {
    ...KT.caption,
    color: K.textSecondary,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 140,
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: {
    width: "70%",
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: K.textTertiary,
    marginTop: 4,
    height: 12,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    width: 110,
  },
  donutCenterLabel: {
    ...KT.captionBold,
    color: K.textSecondary,
    textTransform: "uppercase",
  },
  donutCenterValue: {
    ...KT.headingLarge,
    color: K.textPrimary,
  },
  donutCenterName: {
    ...KT.caption,
    color: K.coralDark,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: K.border,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: kinetic.radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: { flex: 1 },
  categoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    gap: 8,
  },
  categoryName: {
    ...KT.headingSmall,
    color: K.textPrimary,
    flex: 1,
  },
  categoryPct: {
    ...KT.headingSmall,
  },
  categoryAmount: {
    ...KT.caption,
    color: K.textSecondary,
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: K.subtle,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  section: { marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    ...KT.headingMedium,
    color: K.textPrimary,
    marginBottom: 8,
  },
  seeAll: {
    ...KT.headingSmall,
    color: K.navy,
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    ...kinetic.shadows.card,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  insightBody: { flex: 1 },
  insightTitle: {
    ...KT.headingSmall,
    color: K.textPrimary,
    marginBottom: 2,
  },
  insightDesc: {
    ...KT.body,
    color: K.textSecondary,
  },
  spenderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    ...kinetic.shadows.card,
  },
  spenderRank: {
    ...KT.headingSmall,
    color: K.textTertiary,
    width: 16,
    textAlign: "center",
  },
  spenderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: K.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  spenderAvatarText: {
    ...KT.headingSmall,
    fontSize: 13,
    color: K.navy,
  },
  spenderInfo: { flex: 1 },
  spenderName: {
    ...KT.bodyMedium,
    fontSize: 15,
    color: K.textPrimary,
  },
  spenderShare: {
    ...KT.caption,
    color: K.textSecondary,
  },
  spenderAmount: {
    ...KT.headingSmall,
    color: K.textPrimary,
  },
  boardCard: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 14,
    marginBottom: 8,
    ...kinetic.shadows.card,
  },
  boardCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  boardCardIcon: {
    width: 40,
    height: 40,
    borderRadius: kinetic.radii.md,
    backgroundColor: K.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  boardCardInfo: { flex: 1 },
  boardCardName: {
    ...KT.headingSmall,
    color: K.textPrimary,
  },
  boardCardMeta: {
    ...KT.caption,
    color: K.textSecondary,
  },
  boardCardRight: { alignItems: "flex-end" },
  boardCardTotal: {
    ...KT.headingSmall,
    color: K.textPrimary,
  },
  boardCardYou: {
    ...KT.caption,
    color: K.coralDark,
  },
  centered: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: kinetic.radii.xl,
    backgroundColor: K.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    ...KT.headingLarge,
  },
  emptyText: {
    ...KT.body,
    fontSize: 16,
    textAlign: "center",
    maxWidth: 280,
  },
  retryBtn: {
    backgroundColor: K.navy,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: kinetic.radii.md,
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  retryBtnText: {
    color: K.textInverse,
    ...KT.headingSmall,
  },
});
