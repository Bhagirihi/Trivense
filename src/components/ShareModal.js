import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { showToast } from "../utils/toast";
import { copyToClipboard } from "../utils/clipboard";
import { buildBoardJoinUrl } from "../config/appLinks";
import { isValidEmail } from "../utils/validation";

const ShareModal = ({
  visible,
  onClose,
  boardName,
  boardId,
  shareCode,
  boardColor,
  boardIcon,
  onInviteEmail,
}) => {
  const { theme } = useTheme();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const code = shareCode || boardId;
  const joinUrl = buildBoardJoinUrl(code);

  const handleShareApp = async (method) => {
    try {
      const message = `Join my expense board "${boardName}" on Trivense!\n\nBoard Code: ${code}\n\nClick here to join: ${joinUrl}`;

      if (method === "email" || method === "social") {
        const result = await Share.share({
          message,
          ...(method === "email" && {
            subject: `Join my expense board: ${boardName}`,
          }),
        });

        if (result.action === Share.sharedAction) {
          showToast.success("Thanks for Sharing!", "Your invite was shared 🎉");
        }
      } else if (method === "copy") {
        await copyToClipboard(code);
        showToast.success("Copied!", "Board code copied to clipboard 📋");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      showToast.error("Error", "Failed to share. Please try again.");
    }
  };

  const handleInviteByEmail = async () => {
    if (!onInviteEmail) return;

    const email = inviteEmail.trim();
    if (!email) {
      showToast.error("Error", "Please enter an email address");
      return;
    }
    if (!isValidEmail(email)) {
      showToast.error("Error", "Please enter a valid email");
      return;
    }

    try {
      setInviting(true);
      await onInviteEmail(email);
      setInviteEmail("");
      showToast.success("Invitation sent", "They can accept from their invitations");
      onClose();
    } catch (error) {
      showToast.error("Error", error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Share Expense Board
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.shareContent}>
            <View style={styles.boardInfo}>
              <View
                style={[
                  styles.boardIcon,
                  {
                    backgroundColor: `${boardColor || theme.primary}15`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={boardIcon || "view-grid"}
                  size={24}
                  color={boardColor || theme.primary}
                />
              </View>
              <Text style={[styles.boardName, { color: theme.text }]}>
                {boardName}
              </Text>
            </View>

            <View style={styles.codeContainer}>
              <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
                Board Code
              </Text>
              <View
                style={[
                  styles.codeBox,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.codeText, { color: theme.text }]}>
                  {code}
                </Text>
                <TouchableOpacity onPress={() => handleShareApp("copy")}>
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {onInviteEmail ? (
              <View style={styles.emailSection}>
                <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
                  Invite by Email
                </Text>
                <TextInput
                  style={[
                    styles.emailInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="friend@example.com"
                  placeholderTextColor={theme.textSecondary}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.inviteButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleInviteByEmail}
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.inviteButtonText}>Send Invitation</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.shareOptions}>
              <TouchableOpacity
                style={[styles.shareOption, { backgroundColor: theme.background }]}
                onPress={() => handleShareApp("email")}
              >
                <MaterialCommunityIcons
                  name="email"
                  size={24}
                  color={theme.primary}
                />
                <Text style={[styles.shareOptionText, { color: theme.text }]}>
                  Share via Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shareOption, { backgroundColor: theme.background }]}
                onPress={() => handleShareApp("social")}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color={theme.primary}
                />
                <Text style={[styles.shareOptionText, { color: theme.text }]}>
                  Share via Social Apps
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  shareContent: {
    padding: 8,
  },
  boardInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  boardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  boardName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  codeContainer: {
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 16,
    fontFamily: "monospace",
    flex: 1,
    marginRight: 8,
  },
  emailSection: {
    marginBottom: 20,
  },
  emailInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inviteButton: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  shareOptions: {
    gap: 12,
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ShareModal;
