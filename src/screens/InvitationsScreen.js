import React, { useState, useEffect, useCallback } from "react";
import { shadowStyle } from "../utils/platformStyles";
import {
  View,
  StyleSheet,  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { expenseBoardService } from "../services/expenseBoardService";
import { useTranslation } from "../hooks/useTranslation";

function getInitials(name) {
  if (!name) return "?";
  const names = name.split(" ");
  return names.length === 1
    ? names[0][0].toUpperCase()
    : (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

function getAvatarColor(email) {
  const colors = [
    "#FFD700",
    "#FFB6C1",
    "#87CEEB",
    "#90EE90",
    "#FFA07A",
    "#9370DB",
  ];
  let hash = 0;
  for (let i = 0; i < (email || "").length; i++) hash += email.charCodeAt(i);
  return colors[hash % colors.length];
}

export const InvitationsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const initialTab = route.params?.tab === "received" ? "received" : "sent";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const data =
        activeTab === "received"
          ? await expenseBoardService.getReceivedInvitations()
          : await expenseBoardService.getSentInvitations();
      setInvitations(data);
    } catch (error) {
      console.error("Error fetching invitations:", error.message);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (id) => {
    try {
      setIsUpdating(true);
      await expenseBoardService.acceptInvitation(id);
      await fetchInvitations();
      Alert.alert(t("success"), "Invitation accepted successfully");
    } catch (error) {
      Alert.alert(t("error"), error.message || "Failed to accept invitation");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (id) => {
    try {
      setIsUpdating(true);
      await expenseBoardService.rejectInvitation(id);
      await fetchInvitations();
      Alert.alert(t("success"), "Invitation rejected");
    } catch (error) {
      Alert.alert(t("error"), error.message || "Failed to reject invitation");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async (id, label) => {
    Alert.alert(
      activeTab === "sent" ? "Cancel Invitation" : "Leave Board",
      activeTab === "sent"
        ? `Remove the invitation for ${label}?`
        : `Leave ${label}?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: activeTab === "sent" ? "Remove" : "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setIsUpdating(true);
              await expenseBoardService.removeSharedUser(id);
              await fetchInvitations();
            } catch (error) {
              Alert.alert(t("error"), error.message || "Failed to remove");
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const getDisplayName = (item) => {
    if (activeTab === "sent") {
      return (
        item.profiles?.full_name ||
        item.shared_with ||
        "Pending user"
      );
    }
    return (
      item.shared_by_profile?.full_name ||
      item.expense_boards?.name ||
      "Unknown"
    );
  };

  const getDisplayEmail = (item) => {
    if (activeTab === "sent") {
      return item.profiles?.email_address || item.shared_with || "";
    }
    return item.shared_by_profile?.email_address || "";
  };

  const getBoardName = (item) => item.expense_boards?.name || "Unknown board";

  const renderInvitationCard = (item) => {
    const name = getDisplayName(item);
    const email = getDisplayEmail(item);
    const boardName = getBoardName(item);
    const isPending = item.status === "pending" && !item.is_accepted;

    return (
      <View
        key={item.id}
        style={[
          styles.inviteCard,
          {
            backgroundColor: theme.inviteCard.background,
            borderColor: theme.inviteCard.border,
            shadowColor: theme.inviteCard.shadow,
          },
        ]}
      >
        {item.is_accepted ? (
          <View
            style={[
              styles.checkmarkContainer,
              {
                backgroundColor: theme.checkmark.background,
                shadowColor: theme.checkmark.shadow,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="check-decagram"
              size={24}
              color={theme.checkmark.icon}
            />
          </View>
        ) : null}

        <View style={styles.inviteCardContent}>
          <View style={styles.avatarAndInfo}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: getAvatarColor(email),
                  shadowColor: theme.avatar.shadow,
                },
              ]}
            >
              <Text style={[styles.avatarInitials, { color: theme.avatar.text }]}>
                {getInitials(name)}
              </Text>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={[styles.inviteName, { color: theme.text }]}>
                {name}
              </Text>
              <Text
                style={[
                  styles.statusText,
                  { color: item.is_accepted ? theme.success : theme.warning },
                ]}
              >
                {(item.status || "pending").charAt(0).toUpperCase() +
                  (item.status || "pending").slice(1)}
              </Text>
              {email ? (
                <Text style={[styles.inviteEmail, { color: theme.textSecondary }]}>
                  {email}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.badge.board.background },
              ]}
            >
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={14}
                color={theme.badge.board.text}
              />
              <Text style={[styles.badgeText, { color: theme.badge.board.text }]}>
                {boardName}
              </Text>
            </View>
          </View>

          {activeTab === "received" && isPending ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.button.reject.background },
                ]}
                onPress={() => handleReject(item.id)}
                disabled={isUpdating}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.button.reject.text },
                  ]}
                >
                  Reject
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.button.accept.background },
                ]}
                onPress={() => handleAccept(item.id)}
                disabled={isUpdating}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.button.accept.text },
                  ]}
                >
                  Accept
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.singleActionButton,
                { backgroundColor: `${theme.error}15` },
              ]}
              onPress={() => handleRemove(item.id, name)}
              disabled={isUpdating}
            >
              <Text style={[styles.singleActionText, { color: theme.error }]}>
                {activeTab === "sent"
                  ? isPending
                    ? "Cancel Invitation"
                    : "Remove Access"
                  : "Leave Board"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenLayout header={<Header title={t("invitations")} onBack={() => navigation.goBack()} />}>
      <View style={[styles.tabRow, { borderBottomColor: `${theme.text}15` }]}>
        {["sent", "received"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && {
                borderBottomColor: theme.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab ? theme.primary : theme.textSecondary,
                },
              ]}
            >
              {tab === "sent" ? t("sentInvites") : t("receivedInvites")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <AnimatedLoader context="invitations" />
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {invitations.length > 0 ? (
            invitations.map(renderInvitationCard)
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons
                name="account-group"
                size={64}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                {t("noInvitations")}
              </Text>
              <Text
                style={[styles.emptyStateText, { color: theme.textSecondary }]}
              >
                {activeTab === "sent"
                  ? t("noSentInvites")
                  : t("noReceivedInvites")}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  inviteCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    ...shadowStyle(3),
    overflow: "hidden",
  },
  inviteCardContent: { padding: 20 },
  avatarAndInfo: { flexDirection: "row", marginBottom: 12 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarInitials: { fontWeight: "600", fontSize: 20 },
  userInfoContainer: { flex: 1, justifyContent: "center" },
  inviteName: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: "800", marginBottom: 4 },
  inviteEmail: { fontSize: 14 },
  badgeContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { fontSize: 13, fontWeight: "500" },
  buttonContainer: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionButtonText: { fontSize: 15, fontWeight: "600" },
  singleActionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  singleActionText: { fontSize: 15, fontWeight: "600" },
  checkmarkContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    borderRadius: 16,
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateContainer: {
    alignItems: "center",
    padding: 32,
    gap: 16,
    minHeight: 320,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});

export default InvitationsScreen;
