import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { notificationService } from "../services/notificationService";
import { supabase } from "../config/supabase";
import { showToast } from "../utils/toast";
import { realTimeSync } from "../services/realTimeSync";
import { useTranslation } from "../hooks/useTranslation";
import { kinetic } from "../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Kinetic redesign (2026-11-13): canvas background, white cards, navy
// hero banner, coral unread dots, pill tabs All / Unread / Settlements.
// Data flow unchanged — notificationService + unread-count logic as-is.
// "Settlements" has no dedicated type in the stored rows (creators only
// write type "info"/"warning"), so it matches settlement-like rows by
// type === "settlement" or settle/UPI/paid wording in title + message.

const C = kinetic.colors;
const T = kinetic.typography;
const R = kinetic.radii;

const getDateBucket = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return "today";
  if (date.getTime() === yesterday.getTime()) return "yesterday";
  return "earlier";
};

const formatNotificationTime = (dateString) => {
  const date = new Date(dateString);
  const bucket = getDateBucket(dateString);

  if (bucket === "today" || bucket === "yesterday") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
};

const groupNotifications = (items) => {
  const groups = { today: [], yesterday: [], earlier: [] };
  items.forEach((item) => {
    groups[getDateBucket(item.created_at)].push(item);
  });
  return groups;
};

const isSettlementNotification = (n) => {
  if (n.type === "settlement") return true;
  return /settl|upi|\bpaid\b|payment|you owe|you will receive/i.test(
    `${n.title || ""} ${n.message || ""}`
  );
};

export const NotificationScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      showToast.error("Failed to fetch notifications");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const subscription = realTimeSync.subscribeToNotifications((newNotification) => {
      if (newNotification) {
        setNotifications((prev) => [newNotification, ...prev]);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (_error) {
      showToast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (_error) {
      showToast.error("Failed to mark all notifications as read");
    }
  };

  const handleNotificationPress = async (notification) => {
    markAsRead(notification.id);
    if (!notification.trip_name) return;

    try {
      const { data: boards } = await supabase
        .from("expense_boards")
        .select("id, name, total_budget, total_expense")
        .eq("name", notification.trip_name)
        .limit(1);

      if (boards?.[0]) {
        navigation.navigate("ExpenseBoardDetails", {
          boardId: boards[0].id,
          boardName: boards[0].name,
          totalExpenses: boards[0].total_expense || 0,
          totalBudget: boards[0].total_budget || 0,
        });
        return;
      }
    } catch (error) {
      console.error("Error resolving notification board:", error);
    }

    navigation.navigate("ExpenseBoard");
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const settlementCount = useMemo(
    () => notifications.filter(isSettlementNotification).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    if (activeTab === "unread") return notifications.filter((n) => !n.read);
    if (activeTab === "settlements") {
      return notifications.filter(isSettlementNotification);
    }
    return notifications;
  }, [notifications, activeTab]);

  const grouped = useMemo(() => groupNotifications(filtered), [filtered]);

  const sectionMeta = [
    { key: "today", label: t("today") },
    { key: "yesterday", label: t("yesterday") },
    { key: "earlier", label: "Earlier" },
  ];

  const tabs = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "settlements", label: "Settlements", count: settlementCount },
  ];

  const renderUnreadBanner = () => {
    if (unreadCount === 0) return null;
    return (
      <LinearGradient
        colors={C.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.unreadBanner}
      >
        <View style={styles.unreadBannerLeft}>
          <View style={styles.unreadBannerIcon}>
            <MaterialCommunityIcons name="bell-ring" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.unreadBannerCopy}>
            <Text style={styles.unreadBannerTitle} numberOfLines={1}>
              {unreadCount} unread
            </Text>
            <Text style={styles.unreadBannerSub}>Tap to open details</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={markAllAsRead}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("markAllAsRead")}
        >
          <MaterialCommunityIcons name="check-all" size={16} color={C.navy} />
          <Text style={styles.markAllBtnText}>Mark all</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabRow} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabPill, active && styles.tabPillActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${tab.label}, ${tab.count}`}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View
              style={[
                styles.tabCount,
                active ? styles.tabCountActive : styles.tabCountInactive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  active ? styles.tabCountTextActive : styles.tabCountTextInactive,
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderNotification = (notification) => {
    const iconColor = notification.icon_color || C.navy;
    const isUnread = !notification.read;

    return (
      <TouchableOpacity
        key={notification.id}
        activeOpacity={0.85}
        onPress={() => handleNotificationPress(notification)}
        style={styles.notificationWrap}
      >
        <View
          style={[
            styles.notificationCard,
            isUnread && styles.notificationCardUnread,
          ]}
        >
          <View style={styles.notificationRow}>
            <View style={styles.iconCol}>
              <View
                style={[
                  styles.notificationIcon,
                  { backgroundColor: `${iconColor}1A` },
                ]}
              >
                <MaterialCommunityIcons
                  name={notification.icon || "bell-outline"}
                  size={22}
                  color={iconColor}
                />
              </View>
              {isUnread ? <View style={styles.unreadDot} /> : null}
            </View>

            <View style={styles.notificationBody}>
              <View style={styles.notificationTop}>
                <Text
                  style={[
                    styles.notificationTitle,
                    isUnread && styles.notificationTitleUnread,
                  ]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text style={styles.timestamp}>
                  {formatNotificationTime(notification.created_at)}
                </Text>
              </View>

              <Text style={styles.notificationMessage} numberOfLines={2}>
                {notification.message}
              </Text>

              {notification.trip_name ? (
                <View style={styles.tripChip}>
                  <MaterialCommunityIcons
                    name="view-grid-outline"
                    size={14}
                    color={C.navy}
                  />
                  <Text style={styles.tripName} numberOfLines={1}>
                    {notification.trip_name}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color={C.textTertiary}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupedList = () =>
    sectionMeta.map(({ key, label }) => {
      const items = grouped[key];
      if (!items.length) return null;
      return (
        <View key={key} style={styles.section}>
          <Text style={styles.sectionLabel}>{label}</Text>
          {items.map(renderNotification)}
        </View>
      );
    });

  const renderEmptyState = () => {
    const copy =
      activeTab === "unread"
        ? {
            title: "No unread notifications",
            message: "You're completely caught up — nothing left to read.",
          }
        : activeTab === "settlements"
          ? {
              title: "No settlement notifications",
              message: "Settlement updates will appear here when money moves.",
            }
          : {
              title: t("noNotifications"),
              message: t("noNotificationsMessage"),
            };
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <MaterialCommunityIcons
            name="bell-check-outline"
            size={40}
            color={C.navy}
          />
        </View>
        <Text style={styles.emptyTitle}>{copy.title}</Text>
        <Text style={styles.emptyMessage}>{copy.message}</Text>
      </View>
    );
  };

  const headerRight = (
    <TouchableOpacity
      style={styles.headerBtn}
      onPress={markAllAsRead}
      disabled={unreadCount === 0}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t("markAllAsRead")}
    >
      <MaterialCommunityIcons name="check-all" size={18} color="#FFFFFF" />
      {unreadCount > 0 ? (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <ScreenLayout
      header={
        <Header
          title={t("notifications")}
          onBack={() => navigation.goBack()}
          rightComponent={headerRight}
        />
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.navy}
            colors={[C.navy]}
          />
        }
      >
        {renderTabs()}
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllRow}
            onPress={markAllAsRead}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("markAllAsRead")}
          >
            <MaterialCommunityIcons name="check-all" size={16} color={C.coral} />
            <Text style={styles.markAllRowText}>{t("markAllAsRead")}</Text>
          </TouchableOpacity>
        ) : null}
        {loading && !refreshing ? (
          <AnimatedLoader context="notifications" compact />
        ) : filtered.length > 0 ? (
          <>
            {renderUnreadBanner()}
            {renderGroupedList()}
          </>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.canvas },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: R.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: C.coral,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: R.full,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabPillActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  tabText: {
    ...T.bodyMedium,
    color: C.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabCountActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tabCountInactive: {
    backgroundColor: C.subtle,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabCountTextActive: { color: "#FFFFFF" },
  tabCountTextInactive: { color: C.textSecondary },
  markAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 36,
  },
  markAllRowText: {
    ...T.bodyMedium,
    color: C.coral,
    fontWeight: "700",
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: R.lg,
    marginBottom: 16,
    gap: 12,
    ...kinetic.shadows.elevated,
  },
  unreadBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  unreadBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  unreadBannerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  unreadBannerTitle: {
    color: "#FFFFFF",
    ...T.bodyMedium,
    fontWeight: "700",
  },
  unreadBannerSub: {
    color: "rgba(255,255,255,0.8)",
    ...T.caption,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: R.full,
    minHeight: 36,
  },
  markAllBtnText: { ...T.caption, fontWeight: "700", color: C.navy },
  section: { marginBottom: 8 },
  sectionLabel: {
    ...T.captionBold,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  notificationWrap: { marginBottom: 8 },
  notificationCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 12,
    ...kinetic.shadows.card,
  },
  notificationCardUnread: {
    borderColor: C.navy,
    backgroundColor: C.tintBlue,
  },
  notificationRow: { flexDirection: "row", gap: 12 },
  iconCol: { alignItems: "center" },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    backgroundColor: C.coral,
  },
  notificationBody: { flex: 1 },
  notificationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    ...T.bodyMedium,
    color: C.textPrimary,
    fontWeight: "600",
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: "700",
  },
  timestamp: { ...T.captionBold, color: C.textTertiary },
  notificationMessage: {
    ...T.caption,
    color: C.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  tripChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.full,
    marginTop: 4,
    maxWidth: "100%",
    backgroundColor: C.subtle,
  },
  tripName: {
    ...T.caption,
    fontWeight: "600",
    color: C.navy,
    flexShrink: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: R.xl,
    backgroundColor: C.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { ...T.headingMedium, color: C.textPrimary, textAlign: "center" },
  emptyMessage: {
    ...T.body,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default NotificationScreen;
