import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Share,
  ActivityIndicator,
  Pressable,
  Linking,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import RewardedAdOffer from "../components/RewardedAdOffer";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ThemeToggle from "../components/ThemeToggle";
import { supabase } from "../config/supabase";
import { userService } from "../services/supabaseService";
import { showToast } from "../utils/toast";
import { formatCurrency } from "../utils/formatters";
import { realTimeSync } from "../services/realTimeSync";
import { expenseBoardService } from "../services/expenseBoardService";
import { exportAndShare } from "../services/exportService";
import {
  backupExportToGoogleDrive,
  isGoogleDriveConfigured,
} from "../services/googleDriveService";
import { showPremiumActionInterstitialIfReady } from "../services/adService";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { FEATURES, PLAN_CATALOG } from "../config/subscriptionPlans";
import { useTranslation } from "../hooks/useTranslation";
import {
  requestNotificationPermissionFromSetup,
} from "../services/pushNotificationService";
import { useFeatureLockModal } from "../hooks/useFeatureLockModal";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";
import { typography, spacing, radii } from "../theme/tokens";
import { devLog } from "../utils/logger";
import { copyToClipboard } from "../utils/clipboard";
import { LEGAL_LINKS, buildReferralShareUrl } from "../config/appLinks";
import { referralService } from "../services/referralService";
import BrandLogo from "../components/BrandLogo";

export const SettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { openFeatureLock, featureLockModal } = useFeatureLockModal(navigation);
  const scrollBottomPadding = useFooterScrollPadding();
  const { session } = useAuth();
  const {
    requireFeature,
    hasFeature,
    plan,
    isPremium,
    isPaidSubscriber,
    isAdFree,
    paymentsEnabled,
  } = useSubscription();
  const [budget, setBudget] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [boardCount, setBoardCount] = useState(0);
  const [expenseBoards, setExpenseBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareAppModal, setShowShareAppModal] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralInvitees, setReferralInvitees] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [boardID, updateBoard] = useState("");
  const [userID, setUserID] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sharedMembers, setSharedMembers] = useState([]);
  const [inviteeCount, setInviteeCount] = useState(0);
  const [inviteesList, setInviteesList] = useState([]);
  const [loadingInvitees, setLoadingInvitees] = useState(false);
  const [dataActionLoading, setDataActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = realTimeSync(() => {
      fetchData();
    }, "realtime-settings");
    return unsubscribe;
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const profileResult = await userService.getProfile();
      devLog("budgetData", profileResult);
      const sharedMembers = await expenseBoardService.getSharedMembers();

      const budgetData = profileResult?.profile;
      if (!budgetData?.id) {
        throw new Error("Profile not found");
      }

      setUserID(budgetData.id);
      setBudget(budgetData);
      setMonthlyBudget(budgetData.default_board_budget ?? 0);
      setReferralCode(budgetData.referral_code);
      setSharedMembers(sharedMembers);

      const { data: boardsData, error: boardsError } = await supabase
        .from("expense_boards")
        .select(`*`);
      if (boardsError) throw boardsError;

      const boards = boardsData || [];
      const board = boards.find((b) => b.id === budgetData.board_id);
      const isDefaultBoard = boards.find((b) => b.is_default);

      if (isDefaultBoard) {
        updateBoard(isDefaultBoard.id);
      }
      if (board) {
        setBoardName(board.name);
      } else {
        devLog("Board not found for the given ID");
      }
      setBoardCount(boards.length);
      setExpenseBoards(boards);
    } catch (error) {
      console.error("Error fetching data: <-", error);
      showToast.error(t("error"), t("failedToLoadSettings"));
    } finally {
      setLoading(false);
    }
  };

  const handleShareApp = async (method) => {
    try {
      const downloadUrl = buildReferralShareUrl(referralCode);
      const message = `Join Trivense — ${t("brandTagline")}\n\nUse my referral code: ${referralCode}\n\nDownload on Google Play: ${downloadUrl}`;

      let result;

      if (method === "email" || method === "social") {
        result = await Share.share({
          message,
          ...(method === "email" && {
            subject: `Join Trivense — ${t("brandTagline")}`,
          }),
        });

        if (result.action === Share.sharedAction) {
          showToast.success(t("thanksForSharing"), t("inviteShared"));
        } else if (result.action === Share.dismissedAction) {
          // Optional: silently ignore or log
          devLog("User dismissed the share dialog.");
        }
      } else if (method === "copy") {
        copyToClipboard(referralCode);
        showToast.success(t("copied"), t("referralCodeCopied"));
      }
    } catch (error) {
      console.error("Error sharing:", error);
      showToast.error(t("error"), t("failedToShare"));
    }
  };

  const fetchReferralInvitees = async () => {
    try {
      setLoadingReferrals(true);
      const rows = await referralService.getMyReferrals();
      setReferralInvitees(rows || []);
    } catch (error) {
      console.error("Error fetching referral invitees:", error);
      setReferralInvitees([]);
    } finally {
      setLoadingReferrals(false);
    }
  };

  useEffect(() => {
    if (showShareAppModal) {
      fetchReferralInvitees();
    }
  }, [showShareAppModal]);

  const handleUpdateBudget = async () => {
    try {
      const newBudget = parseFloat(editValue);
      if (isNaN(newBudget) || newBudget < 0) {
        showToast.error(t("error"), t("pleaseEnterValidBudgetAmount"));
        return;
      }

      const defaultBoardId = budget?.board_id;
      if (defaultBoardId) {
        const { error: boardError } = await supabase
          .from("expense_boards")
          .update({ total_budget: newBudget })
          .eq("id", defaultBoardId);
        if (boardError) throw boardError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ default_board_budget: newBudget })
        .eq("id", userID);

      if (profileError) throw profileError;

      setMonthlyBudget(newBudget);
      setEditModalVisible(false);
      showToast.success(t("success"), t("monthlyBudgetUpdated"));
    } catch (error) {
      console.error("Error updating budget:", error);
      showToast.error(t("error"), t("failedToUpdateMonthlyBudget"));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (item.modalKey === "Monthly Budget") {
      setEditValue(
        monthlyBudget != null && monthlyBudget !== ""
          ? String(monthlyBudget)
          : ""
      );
    } else {
      setEditValue(item.subtitle || "");
    }
    if (item.modalKey === "ShareApp") {
      setShowShareAppModal(true);
      return;
    }
    setEditModalVisible(true);
  };

  const handleExportLocal = async () => {
    if (!requireFeature(FEATURES.EXPORT_DATA, navigation)) return;

    await showPremiumActionInterstitialIfReady(isAdFree, paymentsEnabled);

    Alert.alert(t("exportToLocal"), t("chooseExportFormat"), [
      {
        text: t("exportJson"),
        onPress: async () => {
          try {
            setDataActionLoading(true);
            await exportAndShare("json", t("exportToLocal"));
            showToast.success(t("exportSuccess"), t("exportSuccessMessage"));
          } catch (error) {
            console.error("Export error:", error);
            showToast.error(t("exportFailed"), error.message);
          } finally {
            setDataActionLoading(false);
          }
        },
      },
      {
        text: t("exportCsv"),
        onPress: async () => {
          try {
            setDataActionLoading(true);
            await exportAndShare("csv", t("exportToLocal"));
            showToast.success(t("exportSuccess"), t("exportSuccessMessage"));
          } catch (error) {
            console.error("Export error:", error);
            showToast.error(t("exportFailed"), error.message);
          } finally {
            setDataActionLoading(false);
          }
        },
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const handleBackupToGoogleDrive = async () => {
    if (!requireFeature(FEATURES.GOOGLE_DRIVE_BACKUP, navigation)) return;

    if (!isGoogleDriveConfigured()) {
      showToast.error(t("backupFailed"), t("googleDriveNotConfigured"));
      return;
    }

    await showPremiumActionInterstitialIfReady(isAdFree, paymentsEnabled);

    try {
      setDataActionLoading(true);
      const result = await backupExportToGoogleDrive();
      showToast.success(
        t("backupSuccess"),
        `${t("backupSuccessMessage")} (${result.fileName})`
      );
    } catch (error) {
      console.error("Google Drive backup error:", error);
      showToast.error(t("backupFailed"), error.message);
    } finally {
      setDataActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        showToast.error(t("error"), t("failedToLogOut"));
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast.error(t("error"), t("unexpectedErrorOccurred"));
    }
  };

  const updateDefaultBoard = async (boardID) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ board_id: boardID })
        .eq("id", userID);
      if (error) throw error;
      updateBoard(boardID);
      setEditModalVisible(false);
      showToast.success(t("success"), t("defaultBoardUpdated"));
      fetchData();
    } catch (error) {
      console.error("Error updating default board:", error);
      showToast.error(t("error"), t("failedToUpdateDefaultBoard"));
    }
  };

  const handlePasswordReset = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate passwords
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }

      // First, reauthenticate the user with their current password
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      if (reauthError) {
        setError("Current password is incorrect");
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setEditModalVisible(false);
      showToast.success(t("passwordUpdated"));

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDefaultBoardSelector = () => (
    <View
      style={[
        styles.selectorContent,
        { backgroundColor: theme.cardBackground },
      ]}
    >
      <Text style={[styles.modalTitle, { color: theme.text }]}>
        Default Board
      </Text>
      {expenseBoards.map((board) => (
        <TouchableOpacity
          key={board.id}
          style={[
            styles.selectorItem,
            { borderBottomColor: theme.borderLight },
          ]}
          onPress={() => {
            updateDefaultBoard(board.id);
          }}
        >
          <Text style={[styles.selectorItemText, { color: theme.text }]}>
            {board.name}
          </Text>
          {board.id === boardID && (
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={theme.primary}
            />
          )}
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[
          styles.modalButton,
          {
            backgroundColor: theme.errorLight,
            marginTop: 16,
            alignSelf: "flex-start",
          },
        ]}
        onPress={() => setEditModalVisible(false)}
        activeOpacity={0.8}
      >
        <Text style={[styles.modalButtonText, { color: theme.error }]}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMonthlyBudgetEditor = () => (
    <View
      style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}
    >
      <Text style={[styles.modalTitle, { color: theme.text }]}>
        {t("monthlyBudget")}
      </Text>
      <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>
        {t("monthlyBudgetHint")}
      </Text>
      <TextInput
        style={[styles.budgetInput, { color: theme.text, borderColor: theme.border }]}
        value={editValue}
        onChangeText={setEditValue}
        keyboardType="numeric"
        placeholder={t("enterBudgetAmount")}
        placeholderTextColor={theme.textSecondary}
      />
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: theme.errorLight }]}
          onPress={() => setEditModalVisible(false)}
        >
          <Text style={[styles.modalButtonText, { color: theme.error }]}>
            {t("cancel")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: theme.primary }]}
          onPress={handleUpdateBudget}
        >
          <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
            {t("save")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBudgetEditor = () => {
    return (
      <View
        style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}
      >
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          Set Board Budget
        </Text>
        <View style={styles.dropdownContainer}>
          <Text style={[styles.dropdownLabel, { color: theme.text }]}>
            Select Board
          </Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: theme.card }]}
            onPress={() => setShowBoardDropdown(!showBoardDropdown)}
          >
            <Text style={[styles.dropdownText, { color: theme.text }]}>
              {selectedBoard ? selectedBoard.name : "Choose a board"}
            </Text>
            <MaterialCommunityIcons
              name={showBoardDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          {showBoardDropdown && (
            <View
              style={[styles.dropdownList, { backgroundColor: theme.card }]}
            >
              {expenseBoards.map((board) => (
                <TouchableOpacity
                  key={board.id}
                  style={[
                    styles.dropdownItem,
                    {
                      backgroundColor:
                        selectedBoard?.id === board.id
                          ? theme.primaryLight
                          : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setSelectedBoard({
                      ...board,
                      budget: board.total_budget ?? 0,
                    });
                    setEditValue(board.total_budget?.toString() || "");
                    setShowBoardDropdown(false);
                  }}
                >
                  <Text
                    style={[styles.dropdownItemText, { color: theme.text }]}
                  >
                    {board.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {selectedBoard && (
          <View style={styles.budgetInputContainer}>
            <Text style={[styles.budgetLabel, { color: theme.text }]}>
              Budget Amount
            </Text>
            <TextInput
              style={[styles.budgetInput, { color: theme.text }]}
              value={editValue}
              onChangeText={(value) => {
                setEditValue(value);
                if (!selectedBoard) return;
                const parsed = parseFloat(value);
                const nextBudget = Number.isFinite(parsed) ? parsed : 0;
                setSelectedBoard((prev) => ({ ...prev, budget: nextBudget }));
              }}
              keyboardType="numeric"
              placeholder={t("enterBudgetAmount")}
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        )}
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.errorLight }]}
            onPress={() => setEditModalVisible(false)}
          >
            <Text style={[styles.modalButtonText, { color: theme.error }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={handleApplyBudgets}
          >
            <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
              Apply
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={handleApplyAllBudgets}
          >
            <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
              Apply All
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleApplyBudgets = async () => {
    if (!selectedBoard) {
      showToast.error(t("error"), t("pleaseSelectBoardFirst"));
      return;
    }

    devLog("Selected Board:", {
      id: selectedBoard.id,
      name: selectedBoard.name,
      newBudget: selectedBoard.budget,
    });

    try {
      const { error } = await supabase
        .from("expense_boards")
        .update({
          total_budget: selectedBoard.budget || 0,
        })
        .eq("id", selectedBoard.id);

      if (error) throw error;

      showToast.success(t("success"), t("boardBudgetUpdated"));
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating board budget:", error);
      showToast.error(t("error"), t("failedToUpdateBoardBudget"));
    }
  };

  const handleApplyAllBudgets = async () => {
    const message = t("confirmApplyAllMessage").replace("{{amount}}", String(selectedBoard?.budget ?? ""));
    Alert.alert(
      t("confirmApplyAll"),
      message,
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("applyAll"),
          onPress: async () => {
            try {
              for (const newboard of expenseBoards) {
                const { error } = await supabase
                  .from("expense_boards")
                  .update({ total_budget: selectedBoard.budget || 0 })
                  .eq("id", newboard.id);

                if (error) throw error;
              }

              showToast.success(t("success"), t("allBoardBudgetsUpdated"));
              setEditModalVisible(false);
            } catch (error) {
              showToast.error(t("error"), t("failedToApplyAllBudgets"));
            }
          },
        },
      ]
    );
  };

  const renderBoardDetails = () => (
    <View
      style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}
    >
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          Expense Boards
        </Text>
        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
      {expenseBoards.slice(-3).map((board) => {
        const members =
          sharedMembers?.filter((member) => member.board_id === board.id) || [];
        return (
          <View key={board.id} style={styles.boardDetailItem}>
            <View style={styles.boardDetailHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primaryLight },
                ]}
              >
                <MaterialCommunityIcons
                  name="view-dashboard-outline"
                  size={22}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.boardDetailName, { color: theme.text }]}>
                {board.name}
              </Text>
              <Text
                style={[styles.memberCount, { color: theme.textSecondary }]}
              >
                {members.length} members
              </Text>
            </View>

            <View style={styles.memberList}>
              {members.map((member) => (
                <Text
                  key={member.id}
                  style={[styles.memberEmail, { color: theme.textSecondary }]}
                >
                  {member.shared_with || "Unknown"}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderPremiumFeatures = () => (
    <View
      style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}
    >
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          Premium Features
        </Text>
        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.premiumFeatures}>
        {[
          {
            icon: "chart-line",
            title: "Advanced Analytics",
            desc: "Detailed insights and reports",
          },
          {
            icon: "sync",
            title: "Unlimited Sync",
            desc: "Sync across all devices",
          },
          {
            icon: "backup-restore",
            title: "Cloud Backup",
            desc: "Secure cloud storage",
          },
          {
            icon: "account-group",
            title: "Multiple Boards",
            desc: "Create unlimited boards",
          },
          {
            icon: "account-multiple-plus",
            title: "Share Boards",
            desc: "Easily collaborate with others",
          },
          {
            icon: "robot",
            title: "AI Expense Analysis",
            desc: "Smart insights from your sheets coming soon!",
          },
        ].map((feature, index) => (
          <View key={index} style={styles.premiumFeatureItem}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: theme.primaryLight },
              ]}
            >
              <MaterialCommunityIcons
                name={feature.icon}
                size={24}
                color={theme.primary}
              />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                {feature.title}
              </Text>
              <Text
                style={[styles.featureDesc, { color: theme.textSecondary }]}
              >
                {feature.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.pricingSection}>
        <Text style={[styles.priceAmount, { color: theme.text }]}>
          {formatCurrency(299)}
        </Text>
        <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>
          /month
        </Text>
      </View>
      {paymentsEnabled ? (
        <TouchableOpacity
          style={[
            styles.upgradePremiumButton,
            { backgroundColor: theme.primary },
          ]}
          onPress={() => {
            setEditModalVisible(false);
            navigation.navigate("Paywall");
          }}
        >
          <Text style={styles.upgradePremiumText}>Upgrade Now</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderPasswordReset = () => (
    <View
      style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}
    >
      <Text style={[styles.modalTitle, { color: theme.text }]}>
        Reset Password
      </Text>
      {error && (
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      )}
      {success && (
        <Text style={[styles.successText, { color: theme.success }]}>
          Password updated successfully!
        </Text>
      )}
      <TextInput
        style={[
          styles.modalInput,
          {
            color: theme.text,
            borderColor: theme.textLight,
            backgroundColor: theme.inputBackground,
          },
        ]}
        placeholder="Current Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />
      <TextInput
        style={[
          styles.modalInput,
          {
            color: theme.text,
            borderColor: theme.textLight,
            backgroundColor: theme.inputBackground,
          },
        ]}
        placeholder="New Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={[
          styles.modalInput,
          {
            color: theme.text,
            borderColor: theme.textLight,
            backgroundColor: theme.inputBackground,
          },
        ]}
        placeholder="Confirm New Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: theme.errorLight }]}
          onPress={() => {
            setEditModalVisible(false);
            setError(null);
            setSuccess(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }}
        >
          <Text style={[styles.modalButtonText, { color: theme.error }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: theme.primary }]}
          onPress={handlePasswordReset}
          disabled={loading}
        >
          <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
            {loading ? "Updating..." : "Reset"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const fetchInvitees = async () => {
    try {
      setLoadingInvitees(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.user) return;

      const { data: sharedUsers, error } = await supabase
        .from("shared_users")
        .select(
          `
          id,
          shared_with,
          board_id,
          is_accepted,
          created_at,
          expense_boards (name)
        `
        )
        .eq("shared_by", session.user.id);

      if (error) throw error;

      const formattedInvitees = (sharedUsers || []).map((su) => ({
        id: su.id,
        userName: su.shared_with || "Unknown",
        userEmail: su.shared_with || "Unknown",
        boardName: su.expense_boards?.name || "Unknown Board",
        status: su.is_accepted ? "accepted" : "pending",
        createdAt: su.created_at,
      }));

      setInviteesList(formattedInvitees);
      setInviteeCount(formattedInvitees.length);
    } catch (error) {
      console.error("Error fetching invitees:", error);
      showToast.error(t("error"), t("failedToLoadInvitees"));
    } finally {
      setLoadingInvitees(false);
    }
  };

  useEffect(() => {
    if (boardID) {
      fetchInvitees();
    }
  }, [boardID]);

  const renderInvitees = () => (
    <View
      style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}
    >
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Invitees</Text>
        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {loadingInvitees ? (
        <View style={[styles.loadingContainer, { padding: 20 }]}>
          <AnimatedLoader context="invitations" compact />
        </View>
      ) : inviteesList.length === 0 ? (
        <View style={[styles.emptyContainer, { padding: 20 }]}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={48}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No invitees found
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            When you share boards, your invitees will appear here
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {inviteesList.map((invitee, index) => (
            <View
              key={invitee.id ?? `invitee-${index}`}
              style={{
                padding: 16,
                borderBottomWidth: index !== inviteesList.length - 1 ? 1 : 0,
                borderBottomColor: `${theme.text}10`,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${theme.primary}15`,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={28}
                    color={theme.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: theme.text,
                        marginRight: 8,
                      }}
                    >
                      {invitee.userName}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor:
                          invitee.status === "accepted"
                            ? `${theme.success}15`
                            : `${theme.warning}15`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            invitee.status === "accepted"
                              ? theme.success
                              : theme.warning,
                          textTransform: "capitalize",
                        }}
                      >
                        {invitee.status}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={16}
                      color={theme.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                      {invitee.userEmail}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <MaterialCommunityIcons
                  name="view-dashboard"
                  size={18}
                  color={theme.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  {invitee.boardName}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={theme.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSecondary,
                  }}
                >
                  Invited on {new Date(invitee.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderEditModal = () => {
    if (!editModalVisible) return null;

    let modalContent;
    const modalKey = editingItem?.modalKey ?? editingItem?.title;
    switch (modalKey) {
      case "Default Board":
        modalContent = renderDefaultBoardSelector();
        break;
      case "Monthly Budget":
        modalContent = renderMonthlyBudgetEditor();
        break;
      case "Premium Access":
        modalContent = renderPremiumFeatures();
        break;
      case "Reset Password":
        modalContent = renderPasswordReset();
        break;
      case "Expense Board":
        modalContent = renderBoardDetails();
        break;
      case "Invitees":
        modalContent = renderInvitees();
        break;
      default:
        return null;
    }

    return (
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>{modalContent}</View>
      </Modal>
    );
  };

  const renderShareAppModal = () => (
    <Modal
      visible={showShareAppModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowShareAppModal(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.cardBackground },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t("shareApp")}
            </Text>
            <TouchableOpacity onPress={() => setShowShareAppModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.shareContent}>
            <View style={styles.appInfo}>
              <BrandLogo size={44} backgroundColor={theme.primary} style={styles.appIcon} />
              <View style={styles.appText}>
                <Text style={[styles.appName, { color: theme.text }]}>
                  Trivense
                </Text>
                <Text style={[styles.appTagline, { color: theme.textSecondary }]}>
                  {t("brandTagline")}
                </Text>
              </View>
            </View>

            <View style={styles.codeContainer}>
              <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
                Your Referral Code
              </Text>
              <View style={[styles.codeBox, { backgroundColor: theme.card }]}>
                <Text style={[styles.codeText, { color: theme.text }]}>
                  {referralCode}
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

            <Text style={[styles.referralRewardBanner, { color: theme.primary }]}>
              {t("referralRewardHint")}
            </Text>

            <View style={styles.shareOptions}>
              <TouchableOpacity
                style={[styles.shareOption, { backgroundColor: theme.card }]}
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
                style={[styles.shareOption, { backgroundColor: theme.card }]}
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

            <View style={styles.referralInviteesSection}>
              <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
                {t("referralSignups")}
              </Text>
              {loadingReferrals ? (
                <ActivityIndicator color={theme.primary} style={{ marginVertical: 12 }} />
              ) : referralInvitees.length === 0 ? (
                <Text style={[styles.referralEmptyText, { color: theme.textSecondary }]}>
                  {t("noReferralSignups")}
                </Text>
              ) : (
                referralInvitees.map((invitee) => (
                  <View
                    key={invitee.id}
                    style={[
                      styles.referralInviteeRow,
                      { borderColor: theme.border, backgroundColor: theme.card },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="account-check-outline"
                      size={22}
                      color={theme.primary}
                    />
                    <View style={styles.referralInviteeText}>
                      <Text style={[styles.referralInviteeName, { color: theme.text }]}>
                        {invitee.full_name || invitee.email || t("invited")}
                      </Text>
                      {invitee.email ? (
                        <Text style={[styles.referralInviteeEmail, { color: theme.textSecondary }]}>
                          {invitee.email}
                        </Text>
                      ) : null}
                      <Text style={[styles.referralInviteeDate, { color: theme.textSecondary }]}>
                        {new Date(invitee.joined_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSettingItem = ({
    icon,
    title,
    subtitle,
    rightComponent,
    onPress,
    showBorder = true,
    editable = true,
    isSwitch = false,
    switchValue,
    onSwitchChange,
    lockedFeature,
  }) => {
    const isLocked = lockedFeature && !hasFeature(lockedFeature);

    return (
    <TouchableOpacity
      key={`${icon}-${String(title)}`}
      style={[
        styles.settingItem,
        showBorder && {
          borderBottomWidth: 1,
          borderBottomColor: theme.borderLight,
        },
        isLocked && { opacity: 0.55 },
      ]}
      onPress={
        isLocked
          ? () => openFeatureLock(lockedFeature)
          : onPress
      }
      disabled={!editable && !onPress && !isLocked}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isLocked ? theme.borderLight : theme.primaryLight,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isLocked ? "lock-outline" : icon}
            size={22}
            color={isLocked ? theme.textSecondary : theme.primary}
          />
        </View>
        <View style={styles.settingTexts}>
          <Text
            style={[
              styles.settingTitle,
              { color: isLocked ? theme.textSecondary : theme.text },
            ]}
          >
            {title}
          </Text>
          {(isLocked || subtitle) && (
            <Text
              style={[styles.settingSubtitle, { color: theme.textSecondary }]}
            >
              {isLocked ? t("premiumFeature") : subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {isSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: theme.borderLight, true: theme.primary }}
            thumbColor={theme.background}
            ios_backgroundColor={theme.borderLight}
          />
        ) : isLocked ? (
          <MaterialCommunityIcons
            name="lock-outline"
            size={20}
            color={theme.textSecondary}
          />
        ) : editable ? (
          <MaterialCommunityIcons
            name="pencil"
            size={20}
            color={theme.textSecondary}
          />
        ) : (
          onPress && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.textSecondary}
            />
          )
        )}
      </View>
    </TouchableOpacity>
  );
  };

  const renderSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionContent,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        {React.Children.map(children, (child, index) =>
          React.cloneElement(child, { key: `${title}-${index}` })
        )}
      </View>
    </View>
  );

  const renderBoardListWithInput = () => (
    <View style={styles.boardListContainer}>
      {expenseBoards.map((board) => (
        <View key={board.id} style={styles.boardItemContainer}>
          <Text style={[styles.boardName, { color: theme.text }]}>
            {board.name}
          </Text>
          <TextInput
            style={[styles.amountInput, { color: theme.text }]}
            value={board.budget?.toString() || ""}
            onChangeText={(value) => {
              const newBudget = parseFloat(value);
              if (!isNaN(newBudget)) {
                setExpenseBoards((prevBoards) =>
                  prevBoards.map((b) =>
                    b.id === board.id ? { ...b, budget: newBudget } : b
                  )
                );
              }
            }}
            keyboardType="numeric"
            placeholder="Enter amount"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      ))}
    </View>
  );

  return (
    <ScreenLayout
      navigation={navigation}
      footerRoute="Settings"
      header={
        <Header
          title={t("settings")}
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("Dashboard");
          }}
        />
      }
    >
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
      >
        {renderSection({
          title: t("appearance"),
          children: [
            renderSettingItem({
              icon: "theme-light-dark",
              title: t("darkMode"),
              subtitle: t("darkModeSubtitle"),
              rightComponent: <ThemeToggle />,
              editable: false,
              showBorder: false,
            }),
            renderSettingItem({
              icon: "bell-ring-outline",
              title: t("enableNotificationsSettings"),
              subtitle: t("enableNotificationsSettingsSubtitle"),
              onPress: async () => {
                const token = await requestNotificationPermissionFromSetup();
                if (token) {
                  const userId = session?.user?.id;
                  if (userId) {
                    await supabase
                      .from("profiles")
                      .update({ has_notifications: true })
                      .eq("id", userId);
                  }
                  showToast.success(t("notificationsEnabledToast"));
                } else {
                  showToast.info(t("notificationsDeniedToast"));
                }
              },
              editable: false,
              showBorder: false,
            }),
          ],
        })}

        {renderSection({
          title: t("expenseSettings"),
          children: [
            renderSettingItem({
              icon: "view-dashboard-outline",
              title: t("defaultBoard"),
              subtitle: `${boardName}`,
              onPress: () => handleEdit({ modalKey: "Default Board", title: t("defaultBoard") }),
              editable: false,
            }),
            renderSettingItem({
              icon: "wallet-outline",
              title: t("monthlyBudget"),
              subtitle: formatCurrency(monthlyBudget),
              onPress: () => handleEdit({ modalKey: "Monthly Budget", title: t("monthlyBudget") }),
            }),

            renderSettingItem({
              icon: "view-dashboard-outline",
              title: t("expenseBoard"),
              subtitle: `${boardCount} ${t("boards")} • ${sharedMembers?.length} ${t("members")}`,
              onPress: () => handleEdit({ modalKey: "Expense Board", title: t("expenseBoard") }),
              editable: false,
              showBorder: false,
            }),
          ],
        })}

        {!paymentsEnabled ? (
          <View
            style={[
              styles.accessStatusWrap,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <MaterialCommunityIcons
              name={isPaidSubscriber ? "crown" : "television-play"}
              size={20}
              color={theme.primary}
            />
            <Text style={[styles.accessStatusText, { color: theme.text }]}>
              {isPaidSubscriber
                ? t("premiumAdFreePausedBilling")
                : t("adSupportedAccessLabel")}
            </Text>
          </View>
        ) : null}

        {!isPaidSubscriber ? (
          <View style={styles.rewardedWrap}>
            <RewardedAdOffer navigation={navigation} />
          </View>
        ) : null}

        {renderSection({
          title: t("boardSharingSection"),
          children: [
            renderSettingItem({
              icon: "account-group-outline",
              title: t("boardSharingTitle"),
              subtitle: t("boardSharingSubtitle"),
              onPress: () => navigation.navigate("Invitations", { tab: "sent" }),
              editable: false,
              lockedFeature: FEATURES.BOARD_SHARING,
              showBorder: false,
            }),
          ],
        })}

        {renderSection({
          title: t("account"),
          children: [
            renderSettingItem({
              icon: "account-outline",
              title: t("editProfile"),
              onPress: () => navigation.navigate("Profile"),
              editable: false,
            }),

            ...(paymentsEnabled
              ? [
                  renderSettingItem({
                    icon: "crown",
                    title: t("premiumAccess"),
                    subtitle: isPremium
                      ? t("currentPlanLabel") +
                        ": " +
                        t(PLAN_CATALOG[plan]?.nameKey || "planFree")
                      : t("premiumAccessSubtitle"),
                    onPress: () => navigation.navigate("Paywall"),
                    showBorder: false,
                    editable: false,
                  }),
                ]
              : []),
          ],
        })}

        {renderSection({
          title: t("security"),
          children: [
            renderSettingItem({
              icon: "lock-reset",
              title: t("resetPassword"),
              onPress: () => handleEdit({ modalKey: "Reset Password", title: t("resetPassword") }),
              showBorder: false,
              editable: false,
            }),
          ],
        })}

        {renderSection({
          title: t("dataManagement"),
          children: [
            renderSettingItem({
              icon: "cloud-upload-outline",
              title: t("backupToGoogleDrive"),
              subtitle: t("backupSubtitle"),
              onPress: handleBackupToGoogleDrive,
              editable: false,
              lockedFeature: FEATURES.GOOGLE_DRIVE_BACKUP,
              rightComponent: dataActionLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : null,
            }),
            renderSettingItem({
              icon: "download-outline",
              title: t("exportToLocal"),
              subtitle: t("exportSubtitle"),
              onPress: handleExportLocal,
              editable: false,
              lockedFeature: FEATURES.EXPORT_DATA,
              rightComponent: dataActionLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : null,
            }),
            renderSettingItem({
              icon: "share-variant-outline",
              title: t("shareApp"),
              subtitle: t("shareAppSubtitle"),
              onPress: () =>
                handleEdit({ modalKey: "ShareApp", title: t("shareApp") }),
              showBorder: false,
              editable: false,
            }),
          ],
        })}

        {renderSection({
          title: t("legal"),
          children: [
            renderSettingItem({
              icon: "shield-lock-outline",
              title: t("privacyPolicy"),
              subtitle: t("privacyPolicySubtitle"),
              onPress: () => Linking.openURL(LEGAL_LINKS.privacyPolicy),
              editable: false,
            }),
            renderSettingItem({
              icon: "file-document-outline",
              title: t("termsOfService"),
              subtitle: t("termsOfServiceSubtitle"),
              onPress: () => Linking.openURL(LEGAL_LINKS.termsOfService),
              editable: false,
            }),
            renderSettingItem({
              icon: "advertisements",
              title: t("advertisingPolicy"),
              subtitle: t("advertisingPolicySubtitle"),
              onPress: () => Linking.openURL(LEGAL_LINKS.advertisingPolicy),
              showBorder: false,
              editable: false,
            }),
          ],
        })}

        {renderSection({
          title: t("support"),
          children: [
            renderSettingItem({
              icon: "information-outline",
              title: t("about"),
              subtitle: t("version"),
              showBorder: false,
              editable: false,
            }),
            // renderSettingItem({
            //   icon: "information-outline",
            //   title: "Font Test",
            //   subtitle: "Test the fonts",
            //   showBorder: false,
            //   editable: true,
            //   onPress: () => navigation.navigate("FontTest"),
            // }),
          ],
        })}

        <TouchableOpacity
          testID="settings-logout-button"
          style={[styles.logoutButton, { backgroundColor: theme.errorLight }]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {renderEditModal()}
      {renderShareAppModal()}
      {featureLockModal}
    </ScreenLayout>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  rewardedWrap: {
    marginBottom: 16,
  },
  accessStatusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 16,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accessStatusText: {
    ...typography.caption,
    flex: 1,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.micro,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionContent: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTexts: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  settingBenefit: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 16,
  },
  settingTapHint: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {},
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectorContent: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  selectorItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  selectorItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  budgetInputContainer: {
    marginBottom: 20,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  budgetInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
    fontSize: 16,
  },
  boardSelector: {
    marginBottom: 20,
  },
  boardSelectorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  boardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  boardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  sharedCount: {
    fontSize: 14,
  },
  premiumFeatures: {
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
  },
  pricingSection: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 24,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: "700",
  },
  pricePeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  upgradePremiumButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  upgradePremiumText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  boardDetailItem: {
    // marginBottom: 20,
    padding: 10,
    borderRadius: 12,
    backgroundColor: (theme) => `${theme.text}08`,
  },
  boardDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  boardDetailName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 12,
  },
  memberCount: {
    fontSize: 14,
  },
  memberList: {
    marginLeft: 48,
  },
  memberEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  shareContent: {
    padding: 8,
  },
  appInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  appIcon: {
    marginRight: 12,
  },
  appText: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "600",
  },
  appTagline: {
    fontSize: 14,
    marginTop: 2,
  },
  codeContainer: {
    marginBottom: 24,
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
  },
  codeText: {
    fontSize: 16,
    fontFamily: "monospace",
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
  referralRewardBanner: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  referralInviteesSection: {
    marginTop: 20,
  },
  referralEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  referralInviteeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  referralInviteeText: {
    flex: 1,
  },
  referralInviteeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  referralInviteeEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  referralInviteeDate: {
    fontSize: 12,
    marginTop: 4,
  },
  dropdownContainer: {
    marginBottom: 20,
    position: "relative",
    zIndex: 1,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
    maxHeight: 200,
    overflow: "scroll",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: (theme) => theme.borderLight,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  boardListContainer: {
    marginBottom: 20,
  },
  boardItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    padding: 8,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  successText: {
    color: "green",
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
});

export default SettingsScreen;
