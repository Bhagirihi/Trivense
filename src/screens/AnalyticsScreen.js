import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import Card from "../components/common/Card";
import { SectionLabel } from "../components/ui/UIKit";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { formatCurrency } from "../utils/formatters";
import { fetchExpenseTrends } from "../services/analyticsService";
import { useAdPolicy } from "../context/AdPolicyContext";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { shouldShowAnalyticsPeriodAd } from "../config/admob";
import { useTranslation } from "../hooks/useTranslation";
import InlineListAd from "../components/InlineListAd";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";
import {
  layout,
  radii,
  spacing,
  typography,
} from "../theme/tokens";

const TIME_PERIOD_KEYS = {
  week: "thisWeek",
  month: "thisMonth",
  year: "thisYear",
  all: "allTime",
};
const TIME_PERIODS = [
  { id: "week", icon: "calendar-week", days: 7 },
  { id: "month", icon: "calendar-month", days: 30 },
  { id: "year", icon: "calendar-range", days: 365 },
  { id: "all", icon: "calendar-clock", days: null },
];

export const AnalyticsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { showBannerAds } = useAdPolicy();
  const { isAdFree, shouldShowPremiumFeatureAds } = useAdEntitlement();
  const scrollBottomPadding = useFooterScrollPadding(0, shouldShowPremiumFeatureAds);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
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

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    try {
      setErrorMessage(null);
      if (!isRefresh) setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const trends = await fetchExpenseTrends(user.id, selectedPeriod);
      const statistics = trends.statistics;
      const analyticsData = {
        totalExpenses: statistics.totalAmount,
        averageExpense: statistics?.averageAmountPerDay,
        stats: {
          highestSpending: statistics.highestAmount,
          lowestSpending: statistics.lowestAmount,
          totalTransactions: statistics.totalCount,
          highestCategory: statistics?.categoryBreakdown[0]?.name,
          highestCategoryPercentage:
            statistics?.categoryBreakdown[0]?.percentage,
          previousPeriod: {
            percentageChange: statistics.previousPeriod?.percentageChange || 0,
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
                ? theme.error
                : theme.success,
          },
          {
            title: "Top Category",
            description: (() => {
              const names = (statistics?.categoryBreakdown || [])
                .slice(0, 3)
                .map((c) => c?.name)
                .filter(Boolean);
              if (names.length === 0) return "Add expenses to see top categories.";
              if (names.length === 1) return `${names[0]} is your top spending category.`;
              const last = names.pop();
              return `${names.join(", ")} and ${last} are your top spending categories.`;
            })(),
            icon: "tag-multiple",
            color: theme.accent,
          },
          {
            title: "Savings Opportunity",
            description: (() => {
              const top = statistics?.categoryBreakdown?.[0]?.name;
              const pct = Math.abs(statistics?.previousPeriod?.percentageChange || 0);
              if (!top) return "Track spending to find savings opportunities.";
              return `You could save ${pct}% by reducing ${top} expenses`;
            })(),
            icon: "piggy-bank",
            color: theme.info,
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
  }, [selectedPeriod, theme.accent, theme.error, theme.info, theme.success]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const pctChange = analytics.stats.previousPeriod?.percentageChange || 0;
  const isUp = pctChange >= 0;
  const showPeriodAd =
    showBannerAds &&
    shouldShowAnalyticsPeriodAd(isAdFree, selectedPeriod);

  const renderPeriodChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.periodRow}
    >
      {TIME_PERIODS.map((period) => {
        const active = selectedPeriod === period.id;
        return (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodChip,
              {
                backgroundColor: active ? theme.primary : theme.surface,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setSelectedPeriod(period.id)}
          >
            <MaterialCommunityIcons
              name={period.icon}
              size={16}
              color={active ? theme.white : theme.textSecondary}
            />
            <Text
              style={[
                styles.periodChipText,
                { color: active ? theme.white : theme.text },
              ]}
            >
              {t(TIME_PERIOD_KEYS[period.id] || period.id)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderPeriodModal = () => (
    <Modal
      visible={showPeriodDropdown}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPeriodDropdown(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t("selectPeriod")}
            </Text>
            <TouchableOpacity onPress={() => setShowPeriodDropdown(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          {TIME_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodOption,
                  {
                    backgroundColor:
                      selectedPeriod === period.id
                        ? theme.primaryMuted
                        : "transparent",
                  },
                ]}
                onPress={() => {
                  setSelectedPeriod(period.id);
                  setShowPeriodDropdown(false);
                }}
              >
                <MaterialCommunityIcons
                  name={period.icon}
                  size={22}
                  color={
                    selectedPeriod === period.id
                      ? theme.primary
                      : theme.text
                  }
                />
                <Text
                  style={[
                    styles.periodOptionText,
                    {
                      color:
                        selectedPeriod === period.id
                          ? theme.primary
                          : theme.text,
                    },
                  ]}
                >
                  {t(TIME_PERIOD_KEYS[period.id] || period.id)}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </Modal>
  );

  const renderHeroCard = () => (
    <LinearGradient
      colors={theme.gradient}
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
          <Text style={styles.heroSub}>
            Avg {formatCurrency(analytics.averageExpense)}/day
          </Text>
        </View>
        <View style={styles.trendPill}>
          <MaterialCommunityIcons
            name={isUp ? "trending-up" : "trending-down"}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.trendPillText}>
            {Math.abs(pctChange)}%
          </Text>
        </View>
      </View>
      <View style={styles.miniStatsRow}>
        {[
          { label: "Highest", value: formatCurrency(analytics.stats.highestSpending) },
          { label: "Lowest", value: formatCurrency(analytics.stats.lowestSpending) },
          { label: "Txns", value: String(analytics.stats.totalTransactions) },
        ].map((item) => (
          <View key={item.label} style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>{item.label}</Text>
            <Text style={styles.miniStatValue} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );

  const renderInsights = () => (
    <View style={styles.section}>
      <SectionLabel title="Insights" style={styles.sectionLabelFirst} />
      {analytics.insights.map((insight, index) => (
        <Card key={index} padding="small" style={styles.insightCard}>
          <View style={styles.insightRow}>
            <View
              style={[
                styles.insightIcon,
                { backgroundColor: `${insight.color}18` },
              ]}
            >
              <MaterialCommunityIcons
                name={insight.icon}
                size={22}
                color={insight.color}
              />
            </View>
            <View style={styles.insightBody}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>
                {insight.title}
              </Text>
              <Text style={[styles.insightDesc, { color: theme.textSecondary }]}>
                {insight.description}
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  const renderCategoryBreakdown = () => (
    <View style={styles.section}>
      <SectionLabel title="By category" />
      {analytics.topCategories.map((category, index) => (
        <Card key={index} padding="small" style={styles.categoryCard}>
          <View style={styles.categoryRow}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: `${category.color || theme.primary}18` },
              ]}
            >
              <MaterialCommunityIcons
                name={category.icon || "tag"}
                size={20}
                color={category.color || theme.primary}
              />
            </View>
            <View style={styles.categoryInfo}>
              <View style={styles.categoryTop}>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryPct, { color: theme.primary }]}>
                  {category.percentage}%
                </Text>
              </View>
              <Text style={[styles.categoryAmount, { color: theme.textSecondary }]}>
                {formatCurrency(category.amount)} · {category.count} txns
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.borderLight }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: category.color || theme.primary,
                      width: `${Math.min(category.percentage || 0, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  return (
    <ScreenLayout
      navigation={navigation}
      footerRoute="Analytics"
      showAdBanner={shouldShowPremiumFeatureAds}
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
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.md,
          paddingBottom: scrollBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderPeriodChips()}
        {showPeriodAd ? <InlineListAd style={{ marginBottom: spacing.md }} /> : null}
        {loading && !refreshing ? (
          <AnimatedLoader context="analytics" compact />
        ) : errorMessage ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={theme.error}
            />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: theme.primary }]}
              onPress={() => fetchAnalytics()}
            >
              <Text style={styles.retryBtnText}>{t("retry") || "Retry"}</Text>
            </TouchableOpacity>
          </View>
        ) : analytics.totalExpenses === 0 ? (
          <View style={styles.centered}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primaryMuted }]}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={36}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No data yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t("noExpenseDataForPeriod")}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
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
            {renderInsights()}
            {renderCategoryBreakdown()}
          </>
        )}
      </ScrollView>
      {renderPeriodModal()}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  periodRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  periodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  periodChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#003D66",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.75)",
    ...typography.caption,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  heroSub: {
    color: "rgba(255,255,255,0.7)",
    ...typography.caption,
    marginTop: spacing.xs,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  trendPillText: {
    color: "#FFFFFF",
    ...typography.label,
    fontWeight: "700",
  },
  miniStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  miniStatLabel: {
    color: "rgba(255,255,255,0.7)",
    ...typography.micro,
    marginBottom: 4,
  },
  miniStatValue: {
    color: "#FFFFFF",
    ...typography.label,
    fontWeight: "700",
  },
  section: { marginBottom: spacing.md },
  sectionLabelFirst: { marginTop: 0 },
  insightCard: { marginBottom: spacing.sm },
  insightRow: { flexDirection: "row", gap: spacing.md },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  insightBody: { flex: 1 },
  insightTitle: { ...typography.label, marginBottom: 4 },
  insightDesc: { ...typography.caption, lineHeight: 18, fontWeight: "400" },
  categoryCard: { marginBottom: spacing.sm },
  categoryRow: { flexDirection: "row", gap: spacing.md },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: { flex: 1 },
  categoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  categoryName: { ...typography.label },
  categoryPct: { ...typography.label, fontWeight: "700" },
  categoryAmount: { ...typography.caption, marginBottom: spacing.sm, fontWeight: "400" },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  centered: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { ...typography.h3 },
  emptyText: { ...typography.body, textAlign: "center", maxWidth: 280 },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  retryBtnText: { color: "#FFFFFF", ...typography.label },
  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.h3 },
  periodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  periodOptionText: { ...typography.bodyMedium, flex: 1 },
});
