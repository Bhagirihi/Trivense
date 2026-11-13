import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { expenseBoardService } from "../services/expenseBoardService";
import ShareModal from "../components/ShareModal";
import AddBoardModal from "../components/AddBoardModal";
import JoinBoardModal from "../components/JoinBoardModal";
import { showToast } from "../utils/toast";
import { realTimeSync } from "../services/realTimeSync";
import { sendExpenseBoardDeletedNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useSubscription } from "../context/SubscriptionContext";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { useAdPolicy } from "../context/AdPolicyContext";
import { FEATURES } from "../config/subscriptionPlans";
import { subscriptionService } from "../services/subscriptionService";
import { supabase } from "../config/supabase";
import { formatCurrency } from "../utils/formatters";
import { kinetic, layout, spacing } from "../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import InlineListAd from "../components/InlineListAd";
import { BoardCard } from "../components/kinetic/BoardCard";
import { SponsoredAdSlot } from "../components/kinetic/SponsoredAdSlot";
import {
  interleaveListWithAds,
  isAdListItem,
} from "../utils/listWithAds";
import { LIST_AD_INTERVAL_BOARDS } from "../config/admob";
import { useFocusEffect } from "@react-navigation/native";
import { fromPaise } from "../utils/settlements";

const K = kinetic.colors;

/** Board icon names (MaterialCommunityIcons) render as emoji in BoardCard. */
const BOARD_ICON_EMOJI = {
  home: "🏠",
  briefcase: "💼",
  car: "🚗",
  food: "🍕",
  shopping: "🛍️",
  movie: "🎬",
  music: "🎵",
  book: "📚",
  "gamepad-variant": "🎮",
  airplane: "✈️",
  "view-grid": "💰",
};

export const ExpenseBoardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    subscription,
    requireFeature,
    hasFeature,
    paymentsEnabled,
  } = useSubscription();
  const { isAdFree } = useAdEntitlement();
  const { showBannerAds } = useAdPolicy();
  const [expenseBoards, setExpenseBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canJoinMore, setCanJoinMore] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  // boardId -> { members, yourShare, unsettledCount, isDebtor } from
  // getExpenseBoardsByID (real settlements; loaded alongside the list).
  const [boardSummaries, setBoardSummaries] = useState({});

  useEffect(() => {
    fetchExpenseBoards();
    const cleanup = realTimeSync.subscribeToExpenseBoard(fetchExpenseBoards);
    return () => cleanup?.();
  }, []);

  const refreshSharingLimits = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCanJoinMore(false);
        return;
      }
      // When IAP is paused, join stays available (same as share).
      if (!paymentsEnabled) {
        setCanJoinMore(true);
        return;
      }
      const joinCheck = await subscriptionService.canJoinSharedBoard(
        subscription,
        user.id
      );
      setCanJoinMore(joinCheck.allowed);
    } catch {
      setCanJoinMore(false);
    }
  }, [subscription, paymentsEnabled]);

  useFocusEffect(
    useCallback(() => {
      refreshSharingLimits();
    }, [refreshSharingLimits])
  );

  const filteredBoards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? expenseBoards.filter((b) =>
          String(b.name || "").toLowerCase().includes(q)
        )
      : expenseBoards;
    if (filter === "active") {
      list = list.filter(
        (b) => (boardSummaries[b.id]?.unsettledCount || 0) > 0
      );
    } else if (filter === "settled") {
      list = list.filter(
        (b) => (boardSummaries[b.id]?.unsettledCount || 0) === 0
      );
    }
    return list;
  }, [expenseBoards, searchQuery, filter, boardSummaries]);

  const boardListData = useMemo(() => {
    if (!showBannerAds || isAdFree || filteredBoards.length === 0) {
      return filteredBoards;
    }
    return interleaveListWithAds(filteredBoards, {
      interval: LIST_AD_INTERVAL_BOARDS,
    });
  }, [filteredBoards, isAdFree, showBannerAds]);

  const netPosition = useMemo(
    () =>
      expenseBoards.reduce(
        (sum, b) => sum + (boardSummaries[b.id]?.yourShare || 0),
        0
      ),
    [expenseBoards, boardSummaries]
  );
  const activePoolsTotal = useMemo(
    () => expenseBoards.reduce((sum, b) => sum + (b?.totalExpenses || 0), 0),
    [expenseBoards]
  );
  const activeCount = useMemo(
    () =>
      expenseBoards.filter(
        (b) => (boardSummaries[b.id]?.unsettledCount || 0) > 0
      ).length,
    [expenseBoards, boardSummaries]
  );
  const settledCount = expenseBoards.length - activeCount;

  const fetchExpenseBoards = async () => {
    try {
      setLoading(true);
      const data = await expenseBoardService.getExpenseBoards();
      if (!data) {
        showToast.error("Failed to fetch boards", "No data received");
        return;
      }
      setExpenseBoards(data);
      // Enrich each board with real members / your-share / unsettled
      // counts so BoardCard shows true balances, never placeholders.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const results = await Promise.allSettled(
          data.map((board) =>
            expenseBoardService.getExpenseBoardsByID(board.id)
          )
        );
        const summaries = {};
        results.forEach((result, index) => {
          if (result.status !== "fulfilled" || !result.value) return;
          const detail = result.value;
          const participants = detail.participants || [];
          const me = participants.find((p) => p.id === user?.id);
          summaries[data[index].id] = {
            members: participants.map((p) => ({ id: p.id, name: p.name })),
            yourShare: me ? fromPaise(me.balancePaise || 0) : 0,
            unsettledCount: (detail.settlements || []).length,
            isDebtor: (detail.settlements || []).some(
              (s) => s.fromId === user?.id
            ),
          };
        });
        setBoardSummaries(summaries);
      } catch {
        // List still renders; cards fall back to the neutral BoardCard state.
        setBoardSummaries({});
      }
    } catch (error) {
      showToast.error("Failed to fetch boards", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareBoard = async (board) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showToast.error(t("error"), "Please sign in again");
        return;
      }

      // When payments/IAP are paused, sharing stays available (matches requireFeature).
      // Otherwise Free users get 1 shared board via canShareBoardWithLimit.
      if (paymentsEnabled) {
        const shareCheck = await subscriptionService.canShareBoardWithLimit(
          subscription,
          user.id,
          board.id
        );
        if (!shareCheck.allowed) {
          const unlocked = requireFeature(FEATURES.BOARD_SHARING, navigation);
          if (!unlocked) return;
        }
      }

      setSelectedBoard(board);
      setShowShareModal(true);
    } catch (error) {
      console.error("Error opening share:", error);
      showToast.error(t("error"), error.message || t("failedToShare"));
    }
  };

  const handleDeleteBoard = async (board) => {
    Alert.alert(
      t("deleteBoard"),
      `${t("deleteBoardConfirm")} "${board.name}"?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await expenseBoardService.deleteExpenseBoard(board.id);
              await sendExpenseBoardDeletedNotification({
                boardName: board.name,
                icon: board.icon || "view-grid",
                iconColor: board.color || theme.primary,
              });
              showToast.success(t("boardDeletedSuccess"));
              await fetchExpenseBoards();
            } catch (error) {
              showToast.error(t("failedToDeleteBoard"), error.message);
            }
          },
        },
      ]
    );
  };

  const handleJoinBoard = async (codeOrUrl) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // When payments/IAP are paused, joining stays available (matches share).
      if (paymentsEnabled) {
        const joinCheck = await subscriptionService.canJoinSharedBoard(
          subscription,
          user.id
        );
        if (!joinCheck.allowed) {
          requireFeature(FEATURES.BOARD_SHARING, navigation);
          throw new Error(t("joinBoardPremiumOnly"));
        }
      }

      const result = await expenseBoardService.joinBoard(codeOrUrl);
      await fetchExpenseBoards();
      const boardName = result?.board_name || "Board";
      if (result?.already_member) {
        showToast.success("Already joined", `${boardName} is already in your list`);
      } else {
        showToast.success("Board joined", `You joined "${boardName}"`);
      }
      await refreshSharingLimits();
    } catch (error) {
      showToast.error("Error", error.message);
      throw error;
    }
  };

  const handleInviteByEmail = async (email) => {
    if (!selectedBoard?.id) throw new Error("No board selected");
    await expenseBoardService.shareBoardWithEmail(selectedBoard.id, email);
  };

  const getBudgetPct = (board) => {
    const budget = board?.total_budget || 0;
    if (!budget) return 0;
    return Math.min(((board?.totalExpenses || 0) / budget) * 100, 100);
  };

  const headerRight = (
    <TouchableOpacity
      onPress={() => setShowAddModal(true)}
      accessibilityRole="button"
      accessibilityLabel={t("createBoard") || "Create board"}
      style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
    >
      <MaterialCommunityIcons
        name="plus"
        size={20}
        color={theme.headerText || "#FFFFFF"}
      />
    </TouchableOpacity>
  );

  const openBoardDetails = (board) => {
    navigation.navigate("ExpenseBoardDetails", {
      boardId: board.id,
      boardName: board.name,
      totalExpenses: board.totalExpenses,
      totalBudget: board.total_budget,
      totalTransactions: board.totalTransactions,
    });
  };

  const renderBoardCard = (board) => {
    const summary = boardSummaries[board.id] || {};
    const members = summary.members || [];
    return (
      <View key={board.id} style={styles.boardWrap}>
        <BoardCard
          title={board.name}
          subtitle={`By ${board.created_by} · ${board.totalTransactions || 0} expenses`}
          icon={BOARD_ICON_EMOJI[board.icon] || "💰"}
          yourShare={summary.yourShare || 0}
          members={members}
          totalMembers={members.length}
          budgetUsagePercent={getBudgetPct(board)}
          unsettledCount={summary.unsettledCount ?? null}
          settleLabel={summary.isDebtor ? "Settle Up" : null}
          onPress={() => openBoardDetails(board)}
          onSettlePress={
            summary.isDebtor
              ? () => navigation.navigate("Analysis", { boardId: board.id })
              : null
          }
        />
        {!board.isShared ? (
          <View style={styles.boardActions}>
            <TouchableOpacity
              style={styles.boardActionBtn}
              onPress={() => handleShareBoard(board)}
              accessibilityRole="button"
              accessibilityLabel={t("shareBoard") || "Share board"}
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={18}
                color={K.navy}
              />
              <Text style={styles.boardActionText}>
                {t("shareBoard") || "Share"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.boardActionBtn}
              onPress={() => handleDeleteBoard(board)}
              accessibilityRole="button"
              accessibilityLabel={t("deleteBoard")}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={18}
                color={K.danger}
              />
              <Text style={[styles.boardActionText, { color: K.danger }]}>
                {t("delete")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons
          name="view-grid-plus-outline"
          size={40}
          color={K.navy}
        />
      </View>
      <Text style={styles.emptyTitle}>{t("noExpenseBoardsFound")}</Text>
      <Text style={styles.emptySub}>
        Create a board to organize trip or group expenses
      </Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={() => navigation.navigate("CreateExpenseBoard")}
        accessibilityRole="button"
        accessibilityLabel={t("createBoard")}
      >
        <LinearGradient
          colors={K.coralGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyCtaGradient}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.emptyCtaText}>{t("createBoard")}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderFilterChip = (key, label, count) => {
    const selected = filter === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => setFilter(key)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ScreenLayout
        footerRoute={null}
        header={
          <Header
            title={t("expenseBoard")}
            showBack={false}
            rightComponent={headerRight}
          />
        }
      >
        <AnimatedLoader context="boards" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      footerRoute={null}
      header={
        <Header
          title={t("expenseBoard")}
          showBack={false}
          rightComponent={headerRight}
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.xxl + insets.bottom },
        ]}
      >
        {expenseBoards.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>NET POSITION</Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      netPosition > 0
                        ? K.textPositive
                        : netPosition < 0
                          ? K.textNegative
                          : K.textPrimary,
                  },
                ]}
              >
                {netPosition > 0
                  ? `+${formatCurrency(netPosition)}`
                  : netPosition < 0
                    ? `-${formatCurrency(Math.abs(netPosition))}`
                    : formatCurrency(0)}
              </Text>
              <Text style={styles.summarySub}>
                {netPosition > 0
                  ? "in your favour"
                  : netPosition < 0
                    ? "you owe"
                    : "all settled"}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>ACTIVE POOLS</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(activePoolsTotal)}
              </Text>
              <Text style={styles.summarySub}>
                {expenseBoards.length}{" "}
                {expenseBoards.length === 1 ? "board" : "boards"}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.quickRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate("CreateExpenseBoard")}
            accessibilityRole="button"
            accessibilityLabel={t("createBoard") || "Create board"}
            activeOpacity={0.9}
            style={styles.quickFlex}
          >
            <LinearGradient
              colors={K.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.quickCta, kinetic.shadows.ctaCoral]}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.quickCtaText}>
                {t("createBoard") || "Create Board"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (
                !paymentsEnabled ||
                hasFeature(FEATURES.BOARD_SHARING) ||
                canJoinMore
              ) {
                setShowJoinModal(true);
                return;
              }
              requireFeature(FEATURES.BOARD_SHARING, navigation);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("joinBoard") || "Join board"}
            activeOpacity={0.9}
            style={styles.quickFlex}
          >
            <View style={[styles.quickCta, styles.quickJoin]}>
              <MaterialCommunityIcons
                name="account-multiple-plus-outline"
                size={20}
                color={K.navy}
              />
              <Text style={[styles.quickCtaText, { color: K.navy }]}>
                {t("joinBoard") || "Join Board"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {expenseBoards.length > 0 ? (
          <View style={styles.searchBox}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={K.textSecondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search boards…"
              placeholderTextColor={K.textSecondary}
              accessibilityLabel={t("searchBoards")}
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
                  color={K.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {expenseBoards.length > 0 ? (
          <View style={styles.chipRow}>
            {renderFilterChip("all", "All Boards", expenseBoards.length)}
            {renderFilterChip("active", "Active", activeCount)}
            {renderFilterChip("settled", "Settled", settledCount)}
          </View>
        ) : null}

        {expenseBoards.length > 0 ? (
          boardListData.map((item) =>
            isAdListItem(item) ? (
              <View key={item.id} style={styles.adWrap}>
                <SponsoredAdSlot>
                  <InlineListAd />
                </SponsoredAdSlot>
              </View>
            ) : (
              renderBoardCard(item)
            )
          )
        ) : (
          renderEmpty()
        )}
      </ScrollView>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardName={selectedBoard?.name || ""}
        boardId={selectedBoard?.id || ""}
        shareCode={selectedBoard?.share_code || ""}
        boardColor={selectedBoard?.board_color || selectedBoard?.color || theme.primary}
        boardIcon={selectedBoard?.board_icon || selectedBoard?.icon || "view-grid"}
        onInviteEmail={
          selectedBoard && !selectedBoard.isShared ? handleInviteByEmail : undefined
        }
      />
      <AddBoardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateNew={() => {
          setShowAddModal(false);
          navigation.navigate("CreateExpenseBoard");
        }}
        onJoinExisting={() => {
          setShowAddModal(false);
          setShowJoinModal(true);
        }}
        joinLocked={!hasFeature(FEATURES.BOARD_SHARING) && !canJoinMore}
        navigation={navigation}
      />
      <JoinBoardModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinBoard}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: K.canvas,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: kinetic.radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: kinetic.spacing.lg,
    marginBottom: spacing.lg,
    ...kinetic.shadows.card,
  },
  summaryBlock: { flex: 1 },
  summaryLabel: {
    ...kinetic.typography.captionBold,
    color: K.textTertiary,
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...kinetic.typography.displayMedium,
    color: K.textPrimary,
    marginTop: spacing.xs,
  },
  summarySub: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
    marginTop: 2,
  },
  summaryDivider: { width: 1, backgroundColor: K.border, marginHorizontal: spacing.md },
  quickRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickFlex: { flex: 1 },
  quickCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: kinetic.radii.full,
    gap: spacing.sm,
  },
  quickJoin: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.borderStrong,
  },
  quickCtaText: {
    ...kinetic.typography.headingSmall,
    color: K.textInverse,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: K.card,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    color: K.textPrimary,
    ...kinetic.typography.body,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: kinetic.radii.full,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    minHeight: 36,
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: K.navy,
    borderColor: K.navy,
  },
  chipText: {
    ...kinetic.typography.caption,
    fontWeight: "600",
    color: K.textSecondary,
  },
  chipTextSelected: { color: K.textInverse },
  boardWrap: { marginBottom: spacing.md },
  boardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  boardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    gap: 6,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.md,
  },
  boardActionText: {
    ...kinetic.typography.bodyMedium,
    color: K.navy,
  },
  adWrap: { marginBottom: spacing.md },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: kinetic.spacing["3xl"],
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: kinetic.radii.xl,
    backgroundColor: K.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...kinetic.typography.headingLarge, textAlign: "center", color: K.textPrimary },
  emptySub: { ...kinetic.typography.body, textAlign: "center", color: K.textSecondary },
  emptyCta: { marginTop: spacing.sm },
  emptyCtaGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 48,
    borderRadius: kinetic.radii.full,
  },
  emptyCtaText: { color: "#FFFFFF", ...kinetic.typography.headingSmall },
});
