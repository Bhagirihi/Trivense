import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { notificationService } from "../services/notificationService";
import { supabase } from "../config/supabase";
import { showToast } from "../utils/toast";
import { realTimeSync } from "../services/realTimeSync";
import { useTranslation } from "../hooks/useTranslation";
import Card from "../components/common/Card";
import { SectionLabel } from "../components/ui/UIKit";
import { layout, radii, spacing, typography } from "../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

export const NotificationScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (error) {
      showToast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
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

  const grouped = useMemo(() => groupNotifications(notifications), [notifications]);

  const sectionMeta = [
    { key: "today", label: t("today") },
    { key: "yesterday", label: t("yesterday") },
    { key: "earlier", label: "Earlier" },
  ];

  const renderUnreadBanner = () => {
    if (unreadCount === 0) return null;
    return (
      <LinearGradient
        colors={theme.gradient}
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
            <Text style={styles.unreadBannerSub}>
              Tap to open details
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={markAllAsRead}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("markAllAsRead")}
        >
          <MaterialCommunityIcons name="check-all" size={16} color={theme.primary} />
          <Text style={[styles.markAllBtnText, { color: theme.primary }]}>
            Mark all
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  };

  const renderNotification = (notification) => {
    const iconColor = notification.icon_color || theme.primary;
    const isUnread = !notification.read;

    return (
      <TouchableOpacity
        key={notification.id}
        activeOpacity={0.85}
        onPress={() => handleNotificationPress(notification)}
        style={styles.notificationWrap}
      >
        <Card
          padding="small"
          style={[
            styles.notificationCard,
            isUnread && {
              borderColor: theme.primary,
              backgroundColor: theme.primaryMuted,
            },
          ]}
        >
          <View style={styles.notificationRow}>
            <View style={styles.iconCol}>
              <View
                style={[
                  styles.notificationIcon,
                  { backgroundColor: `${iconColor}20` },
                ]}
              >
                <MaterialCommunityIcons
                  name={notification.icon || "bell-outline"}
                  size={22}
                  color={iconColor}
                />
              </View>
              {isUnread ? (
                <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
              ) : null}
            </View>

            <View style={styles.notificationBody}>
              <View style={styles.notificationTop}>
                <Text
                  style={[
                    styles.notificationTitle,
                    { color: theme.text },
                    isUnread && { fontWeight: "700" },
                  ]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text style={[styles.timestamp, { color: theme.textMuted }]}>
                  {formatNotificationTime(notification.created_at)}
                </Text>
              </View>

              <Text
                style={[styles.notificationMessage, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {notification.message}
              </Text>

              {notification.trip_name ? (
                <View
                  style={[
                    styles.tripChip,
                    { backgroundColor: isUnread ? theme.surface : theme.borderLight },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="view-grid-outline"
                    size={14}
                    color={theme.primary}
                  />
                  <Text
                    style={[styles.tripName, { color: theme.primary }]}
                    numberOfLines={1}
                  >
                    {notification.trip_name}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color={theme.textMuted}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderGroupedList = () =>
    sectionMeta.map(({ key, label }) => {
      const items = grouped[key];
      if (!items.length) return null;
      return (
        <View key={key} style={styles.section}>
          <SectionLabel title={label} style={key === "today" ? { marginTop: 0 } : undefined} />
          {items.map(renderNotification)}
        </View>
      );
    });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: theme.primaryMuted }]}>
        <MaterialCommunityIcons name="bell-check-outline" size={40} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {t("noNotifications")}
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
        {t("noNotificationsMessage")}
      </Text>
    </View>
  );

  const headerRight = (
    <TouchableOpacity
      style={[
        styles.headerBtn,
        {
          backgroundColor: unreadCount > 0 ? theme.primaryMuted : theme.borderLight,
          opacity: unreadCount > 0 ? 1 : 0.6,
        },
      ]}
      onPress={markAllAsRead}
      disabled={unreadCount === 0}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name="check-all" size={18} color={theme.primary} />
      {unreadCount > 0 ? (
        <View style={[styles.headerBadge, { backgroundColor: theme.primary }]}>
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
          { paddingBottom: spacing.xxl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <AnimatedLoader context="notifications" compact />
        ) : notifications.length > 0 ? (
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
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    flexGrow: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  unreadBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  unreadBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  unreadBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  unreadBannerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  unreadBannerTitle: {
    color: "#FFFFFF",
    ...typography.label,
    fontWeight: "700",
  },
  unreadBannerSub: {
    color: "rgba(255,255,255,0.8)",
    ...typography.caption,
    marginTop: 2,
    fontWeight: "400",
    flexShrink: 1,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  markAllBtnText: { ...typography.caption, fontWeight: "700" },
  section: { marginBottom: spacing.sm },
  notificationWrap: { marginBottom: spacing.sm },
  notificationCard: { overflow: "hidden" },
  notificationRow: { flexDirection: "row", gap: spacing.md },
  iconCol: { alignItems: "center" },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: spacing.xs,
  },
  notificationBody: { flex: 1 },
  notificationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    ...typography.label,
    flex: 1,
  },
  timestamp: { ...typography.micro, fontWeight: "500" },
  notificationMessage: {
    ...typography.caption,
    lineHeight: 18,
    fontWeight: "400",
    marginBottom: spacing.xs,
  },
  tripChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
    maxWidth: "100%",
  },
  tripName: {
    ...typography.caption,
    fontWeight: "600",
    flexShrink: 1,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h3, textAlign: "center" },
  emptyMessage: {
    ...typography.body,
    textAlign: "center",
    fontWeight: "400",
    lineHeight: 22,
    maxWidth: 280,
  },
});
