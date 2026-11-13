import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { expenseBoardService } from "../services/expenseBoardService";
import { supabase } from "../config/supabase";
import { useTranslation } from "../hooks/useTranslation";
import { showToast } from "../utils/toast";
import { copyToClipboard } from "../utils/clipboard";
import { buildBoardJoinUrl } from "../config/appLinks";
import { kinetic } from "../theme/tokens";

// Kinetic redesign (2026-11-13): canvas background, white cards, navy
// tabs, coral Accept, pale Decline. Service calls unchanged —
// accept/reject/remove via expenseBoardService.
// Resend: there is no resend endpoint (shareBoardWithEmail refuses when
// an invite is already pending), so Resend re-shares the board's real
// join link via the system share sheet. Invite Friends / Copy Link use
// the signed-in user's default board join link, fetched live.

const C = kinetic.colors;
const T = kinetic.typography;
const R = kinetic.radii;

function getInitials(name) {
  if (!name) return "?";
  const names = name.split(" ");
  return names.length === 1
    ? names[0][0].toUpperCase()
    : (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

export const InvitationsScreen = ({ route }) => {
  const { t } = useTranslation();
  const initialTab = route.params?.tab === "received" ? "received" : "sent";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);

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

  const fetchInviteLink = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: boards } = await supabase
        .from("expense_boards")
        .select("id, is_default")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      const board = (boards || []).find((b) => b.is_default) || boards?.[0];
      if (!board) return;
      const code = await expenseBoardService.getBoardShareCode(board.id);
      if (code) setInviteLink(buildBoardJoinUrl(code));
    } catch (error) {
      console.error("Error fetching invite link:", error.message);
    }
  }, []);

  useEffect(() => {
    fetchInviteLink();
  }, [fetchInviteLink]);

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

  const handleResend = async (item) => {
    try {
      setIsUpdating(true);
      const code = await expenseBoardService.getBoardShareCode(item.board_id);
      if (!code) throw new Error("Could not load the board invite link");
      await Share.share({
        message: `Join "${getBoardName(item)}" on Trivense: ${buildBoardJoinUrl(code)}`,
      });
    } catch (error) {
      Alert.alert(t("error"), error.message || "Failed to resend invitation");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInviteFriends = async () => {
    if (!inviteLink) {
      showToast.info("No board yet", "Create a board first to invite friends.");
      return;
    }
    try {
      await Share.share({
        message: `Join my expense board on Trivense: ${inviteLink}`,
      });
    } catch (error) {
      console.error("Error sharing invite link:", error.message);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) {
      showToast.info("No board yet", "Create a board first to invite friends.");
      return;
    }
    copyToClipboard(inviteLink);
    showToast.success(t("copied"), "Invite link copied");
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

  const renderInviteCard = (item) => {
    const name = getDisplayName(item);
    const email = getDisplayEmail(item);
    const boardName = getBoardName(item);
    const isPending = item.status === "pending" && !item.is_accepted;

    return (
      <View key={item.id} style={styles.inviteCard}>
        <View style={styles.inviteCardContent}>
          <View style={styles.avatarAndInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.inviteName}>{name}</Text>
              <View
                style={[
                  styles.statusChip,
                  item.is_accepted ? styles.statusChipAccepted : styles.statusChipPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.is_accepted ? styles.statusTextAccepted : styles.statusTextPending,
                  ]}
                >
                  {(item.status || "pending").charAt(0).toUpperCase() +
                    (item.status || "pending").slice(1)}
                </Text>
              </View>
              {email ? (
                <Text style={styles.inviteEmail}>{email}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={14}
                color={C.navy}
              />
              <Text style={styles.badgeText}>{boardName}</Text>
            </View>
          </View>

          {activeTab === "received" && isPending ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleReject(item.id)}
                disabled={isUpdating}
              >
                <Text style={[styles.actionButtonText, styles.declineButtonText]}>
                  Decline
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAccept(item.id)}
                disabled={isUpdating}
              >
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, styles.acceptButtonText]}>
                  Accept
                </Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === "sent" && isPending ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.resendButton]}
                onPress={() => handleResend(item)}
                disabled={isUpdating}
              >
                <MaterialCommunityIcons name="send" size={16} color={C.navy} />
                <Text style={[styles.actionButtonText, styles.resendButtonText]}>
                  Resend
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleRemove(item.id, name)}
                disabled={isUpdating}
              >
                <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.singleActionButton}
              onPress={() => handleRemove(item.id, name)}
              disabled={isUpdating}
            >
              <Text style={styles.singleActionText}>
                {activeTab === "sent" ? "Remove Access" : "Leave Board"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderInviteFriendsCard = () => (
    <View style={styles.inviteFriendsCard}>
      <View style={styles.inviteFriendsIcon}>
        <MaterialCommunityIcons name="account-plus-outline" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.inviteFriendsText}>
        <Text style={styles.inviteFriendsTitle}>Invite Friends</Text>
        <Text style={styles.inviteFriendsSub}>
          Share your board link so friends can join and split expenses.
        </Text>
      </View>
      <View style={styles.inviteFriendsActions}>
        <TouchableOpacity
          style={styles.inviteFriendsBtn}
          onPress={handleInviteFriends}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="share-variant" size={16} color="#FFFFFF" />
          <Text style={styles.inviteFriendsBtnText}>Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.copyLinkBtn}
          onPress={handleCopyLink}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="content-copy" size={16} color={C.navy} />
          <Text style={styles.copyLinkBtnText}>Copy Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenLayout header={<Header title={t("invitations")} onBack={() => navigation.goBack()} />}>
      {renderInviteFriendsCard()}
      <View style={styles.tabRow}>
        {["sent", "received"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab ? styles.tabTextActive : styles.tabTextInactive,
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
            invitations.map(renderInviteCard)
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={40}
                  color={C.navy}
                />
              </View>
              <Text style={styles.emptyStateTitle}>
                {activeTab === "received"
                  ? "No pending invitations"
                  : t("noInvitations")}
              </Text>
              <Text style={styles.emptyStateText}>
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
  inviteFriendsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: R.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    ...kinetic.shadows.card,
  },
  inviteFriendsIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inviteFriendsText: { flex: 1, minWidth: 0 },
  inviteFriendsTitle: {
    ...T.headingSmall,
    color: C.textPrimary,
  },
  inviteFriendsSub: {
    ...T.caption,
    color: C.textSecondary,
    marginTop: 2,
  },
  inviteFriendsActions: {
    flexDirection: "column",
    gap: 8,
    flexShrink: 0,
  },
  inviteFriendsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.coral,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.full,
    minHeight: 36,
  },
  inviteFriendsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  copyLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.tintBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.full,
    minHeight: 36,
  },
  copyLinkBtnText: {
    color: C.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minHeight: 48,
  },
  tabButtonActive: {
    borderBottomColor: C.coral,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  tabTextActive: { color: C.navy },
  tabTextInactive: { color: C.textSecondary },
  content: { flex: 1, backgroundColor: C.canvas },
  scrollContent: { padding: 16, paddingBottom: 40 },
  inviteCard: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginBottom: 12,
    ...kinetic.shadows.card,
    overflow: "hidden",
  },
  inviteCardContent: { padding: 16 },
  avatarAndInfo: { flexDirection: "row", marginBottom: 12 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.tintBlue,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarInitials: { fontWeight: "700", fontSize: 20, color: C.navy },
  userInfoContainer: { flex: 1, justifyContent: "center" },
  inviteName: { ...T.headingSmall, color: C.textPrimary, marginBottom: 4 },
  statusChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: R.full,
    marginBottom: 4,
  },
  statusChipPending: { backgroundColor: C.tintAmber },
  statusChipAccepted: { backgroundColor: C.tintGreen },
  statusText: { fontSize: 12, fontWeight: "700" },
  statusTextPending: { color: C.warning },
  statusTextAccepted: { color: C.success },
  inviteEmail: { ...T.body, color: C.textSecondary },
  badgeContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.md,
    backgroundColor: C.subtle,
  },
  badgeText: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
  buttonContainer: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: R.md,
    minHeight: 48,
  },
  actionButtonText: { fontSize: 15, fontWeight: "700" },
  acceptButton: { backgroundColor: C.coral, ...kinetic.shadows.ctaCoral },
  acceptButtonText: { color: "#FFFFFF" },
  declineButton: { backgroundColor: C.subtle },
  declineButtonText: { color: C.textPrimary },
  resendButton: { backgroundColor: C.tintBlue },
  resendButtonText: { color: C.navy },
  cancelButton: { backgroundColor: "#FEF2F2" },
  cancelButtonText: { color: C.danger },
  singleActionButton: {
    paddingVertical: 12,
    borderRadius: R.md,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    minHeight: 48,
    justifyContent: "center",
  },
  singleActionText: { fontSize: 15, fontWeight: "700", color: C.danger },
  emptyStateContainer: {
    alignItems: "center",
    padding: 32,
    gap: 12,
    minHeight: 320,
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
  emptyStateTitle: {
    ...T.headingMedium,
    color: C.textPrimary,
    textAlign: "center",
  },
  emptyStateText: {
    ...T.body,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default InvitationsScreen;
