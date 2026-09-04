import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { expenseBoardService } from "../services/expenseBoardService";
import FormInput from "../components/common/FormInput";
import FormButton from "../components/common/FormButton";
import { ScreenActionBar } from "../components/ui/ScreenActionBar";
import ShareModal from "../components/ShareModal";
import Card from "../components/common/Card";
import { SectionLabel } from "../components/ui/UIKit";
import { showToast } from "../utils/toast";
import { copyToClipboard } from "../utils/clipboard";
import { formatNumber, getCurrencySymbol } from "../utils/formatters";
import { useAppSettings } from "../context/AppSettingsContext";
import { sendCreateExpenseBoardNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { buildBoardJoinUrl } from "../config/appLinks";
import { supabase } from "../config/supabase";
import {
  showInterstitialAfterBoardCreate,
  shouldShowBoardCreateInterstitial,
  getSessionInterstitialCount,
} from "../services/adService";
import { subscriptionService } from "../services/subscriptionService";
import { layout, radii, spacing, typography } from "../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BOARD_COLORS = [
  { id: "red", value: "#FF6B6B" },
  { id: "teal", value: "#4ECDC4" },
  { id: "blue", value: "#45B7D1" },
  { id: "green", value: "#96CEB4" },
  { id: "yellow", value: "#FFEEAD" },
  { id: "pink", value: "#D4A5A5" },
  { id: "purple", value: "#9B59B6" },
  { id: "navy", value: "#3498DB" },
  { id: "orange", value: "#E67E22" },
  { id: "mint", value: "#1ABC9C" },
];

const BOARD_ICONS = [
  { id: "home", name: "home", label: "Home" },
  { id: "work", name: "briefcase", label: "Work" },
  { id: "transport", name: "car", label: "Transport" },
  { id: "food", name: "food", label: "Food" },
  { id: "shopping", name: "shopping", label: "Shopping" },
  { id: "entertainment", name: "movie", label: "Entertainment" },
  { id: "music", name: "music", label: "Music" },
  { id: "education", name: "book", label: "Education" },
  { id: "gaming", name: "gamepad-variant", label: "Gaming" },
  { id: "travel", name: "airplane", label: "Travel" },
];

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1 },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
  },
  previewCard: {
    marginBottom: spacing.lg,
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  previewName: { ...typography.h3, textAlign: "center" },
  previewBudget: { ...typography.caption, marginTop: spacing.xs, fontWeight: "500" },
  section: { marginBottom: spacing.lg },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  iconItem: {
    width: "30%",
    minWidth: 96,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  iconLabel: { ...typography.micro, textAlign: "center", fontWeight: "500" },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  shareRowText: { ...typography.bodyMedium, flex: 1 },
  createButton: { marginTop: 0 },
});

export const CreateExpenseBoardScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { currency } = useAppSettings();
  const insets = useSafeAreaInsets();
  const { isAdFree } = useAdEntitlement();
  const [loading, setLoading] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [selectedColor, setSelectedColor] = useState(BOARD_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(BOARD_ICONS[0]);
  const [description, setDescription] = useState("");
  const [perPersonBudget, setPerPersonBudget] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [inviteLink, setinviteLink] = useState("");
  const [errors, setErrors] = useState({});
  const [showShareModal, setShowShareModal] = useState(false);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!boardName.trim()) {
      newErrors.boardName = "Board name is required";
    }
    if (boardName.length > 50) {
      newErrors.boardName = "Board name must be less than 50 characters";
    }
    if (description.length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }
    if (
      !perPersonBudget ||
      isNaN(parseFloat(perPersonBudget)) ||
      parseFloat(perPersonBudget) <= 0
    ) {
      newErrors.perPersonBudget = "Please enter a valid budget amount";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [boardName, description, perPersonBudget]);

  const generateShareCode = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setShareCode(code);
    return code;
  }, []);

  const handleShareBoard = () => {
    setShowShareModal(true);
  };

  const handleCopyCode = () => {
    const code = shareCode || generateShareCode();
    copyToClipboard(code);
    showToast.success("Success", "Board code copied to clipboard");
  };

  const handleShareViaEmail = async () => {
    try {
      const code = shareCode || generateShareCode();
      const subject = `Join my expense board: ${boardName}`;
      const message = `Join my expense board "${boardName}" on Trivense!\n\nBoard Code: ${code}\n\nClick here to join: ${buildBoardJoinUrl(code)}`;
      await Share.share({
        message,
        subject,
      });
    } catch (error) {
      console.error("Error sharing via email:", error);
    }
  };

  const handleShareViaSocial = async () => {
    try {
      const code = shareCode || generateShareCode();
      const message = `Join my expense board "${boardName}" on Trivense!\n\nBoard Code: ${code}\n\nClick here to join: ${buildBoardJoinUrl(code)}`;
      await Share.share({
        message,
      });
    } catch (error) {
      console.error("Error sharing via social:", error);
    }
  };

  const handleCreateBoard = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ownedBoardsBeforeCreate = !isAdFree
        ? await subscriptionService.countOwnedBoards(user.id)
        : 0;

      const boardData = {
        name: boardName.trim(),
        description: description.trim(),
        color: selectedColor.value,
        icon: selectedIcon.name,
        total_budget: parseFloat(perPersonBudget),
        share_code: shareCode || generateShareCode(),
      };

      // Create the board first
      const { data: createdBoard, error } =
        await expenseBoardService.createExpenseBoard(boardData);

      if (error) {
        throw new Error(error?.message || "Failed to create board");
      }

      // Send notification after successful board creation (non-blocking)
      try {
        await sendCreateExpenseBoardNotification({
          boardName: boardName.trim(),
          icon: selectedIcon.name,
          iconColor: selectedColor.value,
        });
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
        console.warn("Board created but notification failed:", notifError);
      }

      showToast.success("Expense board created successfully");

      let showBoardAd = false;
      if (!isAdFree) {
        showBoardAd = await shouldShowBoardCreateInterstitial(
          isAdFree,
          ownedBoardsBeforeCreate,
        );
      }

      if (createdBoard?.id && route.params?.onBoardCreated) {
        route.params.onBoardCreated(createdBoard.id);
      }

      navigation.goBack();

      if (showBoardAd) {
        setTimeout(async () => {
          await showInterstitialAfterBoardCreate(
            isAdFree,
            ownedBoardsBeforeCreate,
          );
          if (getSessionInterstitialCount() >= 2) {
            showToast.info(
              "Go ad-free",
              "Upgrade to Premium for an uninterrupted experience.",
            );
          }
        }, 450);
      }
    } catch (error) {
      console.error("Error creating board:", error);
      showToast.error(
        "Failed to create board",
        error?.message || "Please try again"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => (
    <Card style={styles.previewCard} variant="elevated">
      <View
        style={[
          styles.previewIcon,
          { backgroundColor: `${selectedColor.value}22` },
        ]}
      >
        <MaterialCommunityIcons
          name={selectedIcon.name}
          size={32}
          color={selectedColor.value}
        />
      </View>
      <Text style={[styles.previewName, { color: theme.text }]}>
        {boardName.trim() || "Your board name"}
      </Text>
      <Text style={[styles.previewBudget, { color: theme.textSecondary }]}>
        {perPersonBudget
          ? `${getCurrencySymbol(currency)}${formatNumber(parseFloat(perPersonBudget))} per person`
          : "Set a per-person budget"}
      </Text>
    </Card>
  );

  const renderColorPicker = () => (
    <View style={styles.section}>
      <SectionLabel title="Color" style={{ marginTop: 0 }} />
      <View style={styles.colorGrid}>
        {BOARD_COLORS.map((color) => {
          const selected = selectedColor.id === color.id;
          return (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorItem,
                {
                  backgroundColor: color.value,
                  borderWidth: selected ? 3 : 0,
                  borderColor: theme.text,
                },
              ]}
              onPress={() => setSelectedColor(color)}
            >
              {selected ? (
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderIconPicker = () => (
    <View style={styles.section}>
      <SectionLabel title="Icon" />
      <View style={styles.iconGrid}>
        {BOARD_ICONS.map((icon) => {
          const selected = selectedIcon.id === icon.id;
          return (
            <TouchableOpacity
              key={icon.id}
              style={[
                styles.iconItem,
                {
                  backgroundColor: selected ? theme.primaryMuted : theme.surface,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedIcon(icon)}
            >
              <MaterialCommunityIcons
                name={icon.name}
                size={24}
                color={selected ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.iconLabel,
                  { color: selected ? theme.primary : theme.textSecondary },
                ]}
              >
                {icon.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderShareRow = () => (
    <View style={styles.section}>
      <SectionLabel title="Sharing" />
      <TouchableOpacity
        style={[styles.shareRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={handleShareBoard}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            backgroundColor: theme.primaryMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={theme.primary} />
        </View>
        <Text style={[styles.shareRowText, { color: theme.text }]}>
          Share after creating
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout
      header={
        <Header
          title={t("createExpenseBoard")}
          onBack={() => navigation.goBack()}
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: spacing.xxl + insets.bottom + 80 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {renderPreview()}

          <View style={styles.section}>
            <SectionLabel title="Details" style={{ marginTop: 0 }} />
            <FormInput
              label="Board Name"
              value={boardName}
              onChangeText={(text) => {
                setBoardName(text);
                if (errors.boardName) {
                  setErrors((prev) => ({ ...prev, boardName: undefined }));
                }
              }}
              placeholder="e.g. Europe Trip 2025"
              error={errors.boardName}
              maxLength={50}
            />
            <FormInput
              label="Description"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              placeholder="Optional note for members"
              multiline
              numberOfLines={3}
              error={errors.description}
              maxLength={200}
            />
            <FormInput
              label="Per Person Budget"
              value={perPersonBudget}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9.]/g, "");
                setPerPersonBudget(numericValue);
                if (errors.perPersonBudget) {
                  setErrors((prev) => ({ ...prev, perPersonBudget: undefined }));
                }
              }}
              placeholder="Enter budget amount"
              keyboardType="numeric"
              prefix={getCurrencySymbol(currency)}
              suffix={perPersonBudget ? formatNumber(parseFloat(perPersonBudget)) : ""}
              error={errors.perPersonBudget}
            />
          </View>

          {renderColorPicker()}
          {renderIconPicker()}
          {renderShareRow()}
        </ScrollView>
      </KeyboardAvoidingView>

      <ScreenActionBar>
        <FormButton
          title={t("createBoard")}
          onPress={handleCreateBoard}
          loading={loading}
          size="large"
          style={styles.createButton}
        />
      </ScreenActionBar>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardName={boardName || "New Expense Board"}
        boardId={shareCode || generateShareCode()}
        boardColor={selectedColor.value}
        boardIcon={selectedIcon.name}
      />
    </ScreenLayout>
  );
};
