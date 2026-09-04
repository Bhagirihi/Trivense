import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
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
import { QuickActionTile } from "../components/ui/UIKit";
import Card from "../components/common/Card";
import { layout, radii, spacing, typography } from "../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import InlineListAd from "../components/InlineListAd";
import {
  interleaveListWithAds,
  isAdListItem,
} from "../utils/listWithAds";
import { LIST_AD_INTERVAL_BOARDS } from "../config/admob";
import { useFocusEffect } from "@react-navigation/native";

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

  const boardListData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? expenseBoards.filter((b) =>
          String(b.name || "").toLowerCase().includes(q)
        )
      : expenseBoards;
    if (!showBannerAds || isAdFree || filtered.length === 0) return filtered;
    return interleaveListWithAds(filtered, {
      interval: LIST_AD_INTERVAL_BOARDS,
    });
  }, [expenseBoards, isAdFree, showBannerAds, searchQuery]);

  const fetchExpenseBoards = async () => {
    try {
      setLoading(true);
      const data = await expenseBoardService.getExpenseBoards();
      if (!data) {
        showToast.error("Failed to fetch boards", "No data received");
        return;
      }
      setExpenseBoards(data);
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

  const renderQuickActions = () => (
    <View style={styles.quickRow}>
      <QuickActionTile
        icon="plus-circle-outline"
        label={t("createBoard") || "Create"}
        color={theme.primary}
        onPress={() => navigation.navigate("CreateExpenseBoard")}
      />
      <QuickActionTile
        icon="account-multiple-plus-outline"
        label={t("joinBoard") || "Join"}
        color={theme.accent}
        onPress={() => {
          if (!paymentsEnabled || hasFeature(FEATURES.BOARD_SHARING) || canJoinMore) {
            setShowJoinModal(true);
            return;
          }
          requireFeature(FEATURES.BOARD_SHARING, navigation);
        }}
      />
    </View>
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
    const color = board.color || theme.primary;
    const pct = getBudgetPct(board);
    const overBudget = (board?.totalExpenses || 0) > (board?.total_budget || 0);

    return (
      <Card key={board.id} style={styles.boardCard} padding="medium">
        <View style={styles.boardHeader}>
          <TouchableOpacity
            style={styles.boardHeaderMain}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${board.name}, ${t("totalExpenses")} ${formatCurrency(board?.totalExpenses || 0)}`}
            onPress={() => openBoardDetails(board)}
          >
            <View style={[styles.boardIcon, { backgroundColor: `${color}18` }]}>
              <MaterialCommunityIcons
                name={board.icon || "view-grid"}
                size={22}
                color={color}
              />
            </View>
            <View style={styles.boardTitleCol}>
              <Text style={[styles.boardName, { color: theme.text }]} numberOfLines={1}>
                {board.name}
              </Text>
              <Text style={[styles.boardMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {t("byCreator")} {board.created_by}
                {board.is_default ? ` · ${t("default")}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.boardActions}>
            {!board.isShared ? (
              <TouchableOpacity
                style={styles.actionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("shareBoard") || "Share board"}
                onPress={() => handleShareBoard(board)}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={18}
                  color={theme.primary}
                />
              </TouchableOpacity>
            ) : null}
            {!board.isShared ? (
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("deleteBoard")}
                onPress={() => handleDeleteBoard(board)}
                style={styles.actionBtn}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color={theme.error} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t("open") || "Open"}
              onPress={() => openBoardDetails(board)}
            >
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => openBoardDetails(board)}>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                {t("totalExpenses")}
              </Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatCurrency(board?.totalExpenses || 0)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statBlock}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                {t("budget")}
              </Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatCurrency(board?.total_budget || 0)}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statBlock}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                {t("transactions")}
              </Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {board?.totalTransactions || 0}
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                Budget used
              </Text>
              <Text
                style={[
                  styles.progressPct,
                  { color: overBudget ? theme.error : theme.success },
                ]}
              >
                {pct.toFixed(0)}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.borderLight }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: overBudget ? theme.error : color,
                    width: `${pct}%`,
                  },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primaryMuted }]}>
        <MaterialCommunityIcons
          name="view-grid-plus-outline"
          size={40}
          color={theme.primary}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {t("noExpenseBoardsFound")}
      </Text>
      <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
        Create a board to organize trip or group expenses
      </Text>
      <TouchableOpacity
        style={[styles.emptyCta, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate("CreateExpenseBoard")}
      >
        <MaterialCommunityIcons name="plus" size={20} color={theme.white} />
        <Text style={styles.emptyCtaText}>{t("createBoard")}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <ScreenLayout
        header={
          <Header
            title={t("expenseBoard")}
            onBack={() => navigation.goBack()}
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
      header={
        <Header
          title={t("expenseBoard")}
          onBack={() => navigation.goBack()}
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
        {renderQuickActions()}
        {expenseBoards.length > 0 ? (
          <View
            style={{
              marginHorizontal: layout.screenPadding,
              marginBottom: spacing.sm,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              backgroundColor: theme.card || theme.surface,
            }}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.textSecondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("searchBoardsPlaceholder")}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={t("searchBoards")}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                color: theme.text,
              }}
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
        ) : null}
        {expenseBoards.length > 0 ? (
          boardListData.map((item) =>
            isAdListItem(item) ? (
              <InlineListAd key={item.id} />
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
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  boardCard: {
    marginBottom: spacing.md,
  },
  boardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  boardHeaderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minWidth: 0,
  },
  boardIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  boardTitleCol: { flex: 1 },
  boardName: { ...typography.bodyMedium, fontSize: 17 },
  boardMeta: { ...typography.caption, marginTop: 2, fontWeight: "400" },
  boardActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionBtn: { padding: spacing.xs },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  statBlock: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 32 },
  statLabel: { ...typography.micro, marginBottom: 4 },
  statValue: { ...typography.label, fontWeight: "700" },
  progressSection: { gap: spacing.xs },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { ...typography.caption, fontWeight: "500" },
  progressPct: { ...typography.caption, fontWeight: "700" },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h3, textAlign: "center" },
  emptySub: { ...typography.body, textAlign: "center", fontWeight: "400" },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  emptyCtaText: { color: "#FFFFFF", ...typography.label },
});
