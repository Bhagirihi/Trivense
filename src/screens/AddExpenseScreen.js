import React, { useState, useEffect, useRef } from "react";
import { shadowStyle } from "../utils/platformStyles";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { CategoryList } from "../components/CategoryList";
import { ExpenseBoardList } from "../components/ExpenseBoardList";
import FormInput from "../components/common/FormInput";
import { ScreenActionBar } from "../components/ui/ScreenActionBar";
import { expenseService } from "../services/expenseService";
import { supabase } from "../config/supabase";
import { showToast, showNetworkAwareError } from "../utils/toast";
import { sendCreateExpenseNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import {
  registerExpenseSaveForAd,
  showExpenseInterstitialAfterLeave,
  getSessionInterstitialCount,
} from "../services/adService";
import { getCurrencySymbol, formatCurrency } from "../utils/formatters";
import {
  getExpenseDefaults,
  saveExpenseDefaults,
} from "../utils/expenseDefaultsStorage";
import { expenseBoardService } from "../services/expenseBoardService";
import { categoryService } from "../services/categoryService";
import {
  enqueueOfflineExpense,
  isDeviceOffline,
} from "../utils/offlineExpenseQueue";
import { kinetic } from "../theme/tokens";
import { OcrScannerIcon } from "../components/kinetic/SettlementIcons";

const K = kinetic.colors;

const paymentMethods = [
  { value: "cash", icon: "cash", color: "#4CAF50" },
  { value: "card", icon: "credit-card", color: "#2196F3" },
  { value: "upi", icon: "cellphone-banking", color: "#9C27B0" },
  { value: "net_banking", icon: "bank", color: "#FF9800" },
];

const paymentMethodKeys = {
  cash: "cash",
  card: "card",
  upi: "upi",
  net_banking: "netBanking",
};

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "."];

export const AddExpenseScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { isAdFree } = useAdEntitlement();
  const editingExpense = route.params?.expense;
  const editingExpenseId = route.params?.expenseId || editingExpense?.id;
  const isEditing = Boolean(editingExpenseId);
  const presetBoardId = route.params?.boardId;
  const fromScan = route.params?.fromScan;
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryNameById, setCategoryNameById] = useState({});
  const defaultStyles = useDefaultStyles();
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: null,
    paymentMethod: "cash",
    date: new Date(),
    board: presetBoardId || null,
  });
  // Split preview only: the backend stores one expense row with no
  // per-person split rows, and board settlement math splits equally.
  const [splitMode, setSplitMode] = useState("equal");
  const [boardMembers, setBoardMembers] = useState([]);
  const [unequalShares, setUnequalShares] = useState({});
  // Receipt photo preview only — no receipt upload/storage exists yet.
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const scanToastShown = useRef(false);

  useEffect(() => {
    if (presetBoardId) {
      setFormData((prev) => ({ ...prev, board: presetBoardId }));
    }
  }, [presetBoardId]);

  // "Scan Bill" entry point: the scan itself is coming soon, so say so
  // honestly once instead of pretending a scan ran.
  useEffect(() => {
    if (fromScan && !scanToastShown.current) {
      scanToastShown.current = true;
      showToast.info(
        "Receipt scan coming soon",
        "Attach a photo as a preview for now."
      );
    }
  }, [fromScan]);

  // Board members for the "Paid by" row and the split preview.
  useEffect(() => {
    if (!formData.board) {
      setBoardMembers([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const details = await expenseBoardService.getExpenseBoardsByID(
          formData.board
        );
        if (active && details && !Array.isArray(details)) {
          setBoardMembers(details.participants || []);
        }
      } catch {
        if (active) setBoardMembers([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [formData.board]);

  useEffect(() => {
    if (isEditing) return;
    let active = true;
    (async () => {
      const defaults = await getExpenseDefaults();
      let board = presetBoardId || defaults.board;
      let category = defaults.category;
      const payment = defaults.payment || "cash";

      try {
        if (!board) {
          const boards = await expenseBoardService.getExpenseBoards();
          board = boards?.[0]?.id || null;
        }
        if (!category) {
          const list = await categoryService.getCategories();
          category = list?.[0]?.id || null;
          if (list?.length) {
            const map = {};
            list.forEach((c) => {
              map[c.id] = c.name;
            });
            if (active) setCategoryNameById(map);
          }
        } else {
          try {
            const list = await categoryService.getCategories();
            if (list?.length && active) {
              const map = {};
              list.forEach((c) => {
                map[c.id] = c.name;
              });
              setCategoryNameById(map);
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // keep whatever we already resolved
      }

      if (!active) return;
      setFormData((prev) => ({
        ...prev,
        board: prev.board || board,
        category: prev.category || category,
        paymentMethod: prev.paymentMethod || payment,
      }));
    })();
    return () => {
      active = false;
    };
  }, [isEditing, presetBoardId]);

  useEffect(() => {
    if (!editingExpense) return;

    setFormData({
      amount: String(editingExpense.amount ?? ""),
      description: editingExpense.description || "",
      category: editingExpense.category_id || editingExpense.category?.id || null,
      paymentMethod: editingExpense.payment_method || null,
      date: new Date(editingExpense.date || editingExpense.created_at || Date.now()),
      board: editingExpense.board_id || presetBoardId || null,
    });
  }, [editingExpense, presetBoardId]);

  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast.error(t("pleaseEnterValidAmount"));
      return false;
    }
    if (!formData.category) {
      showToast.error(t("pleaseSelectCategory"));
      return false;
    }
    if (!formData.paymentMethod) {
      showToast.error(t("pleaseSelectPaymentMethod"));
      return false;
    }
    if (!formData.board) {
      showToast.error(t("pleaseSelectExpenseBoard"));
      return false;
    }
    return true;
  };

  const resolveDescription = () => {
    const typed = formData.description.trim();
    if (typed) return typed;
    return (
      categoryNameById[formData.category] ||
      t("expense") ||
      "Expense"
    );
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const description = resolveDescription();
      const expensePayload = {
        amount: parseFloat(formData.amount),
        description,
        category_id: formData.category,
        payment_method: formData.paymentMethod,
        date: formData.date.toISOString(),
        board_id: formData.board,
      };

      if (isEditing) {
        if (await isDeviceOffline()) {
          showToast.info(t("offlineEditNeedsNetwork"));
          return;
        }
        await expenseService.updateExpense(editingExpenseId, expensePayload);
        showToast.success(t("expenseUpdatedSuccess"));
      } else if (await isDeviceOffline()) {
        await enqueueOfflineExpense(expensePayload);
        await saveExpenseDefaults({
          board: formData.board,
          category: formData.category,
          payment: formData.paymentMethod,
        });
        showToast.success(t("expenseSavedOffline"), t("expenseSavedOfflineMessage"));
        navigation.goBack();
        return;
      } else {
        await expenseService.createExpense(expensePayload);
        await saveExpenseDefaults({
          board: formData.board,
          category: formData.category,
          payment: formData.paymentMethod,
        });

        const { data: boardRow } = await supabase
          .from("expense_boards")
          .select("name, board_icon, board_color")
          .eq("id", formData.board)
          .maybeSingle();

        if (boardRow) {
          await sendCreateExpenseNotification({
            boardName: boardRow.name,
            icon: boardRow.board_icon || "cash",
            iconColor: boardRow.board_color || theme.primary,
            expenseName: description,
            expenseAmount: parseFloat(formData.amount),
          });
        }

        showToast.success(t("expenseAddedSuccess"));
      }

      let showAdAfterLeave = false;
      if (!isEditing && !isAdFree) {
        showAdAfterLeave = await registerExpenseSaveForAd(isAdFree);
      }

      navigation.goBack();

      if (showAdAfterLeave) {
        setTimeout(async () => {
          const shown = await showExpenseInterstitialAfterLeave(isAdFree);
          if (shown && getSessionInterstitialCount() >= 2) {
            showToast.info(
              t("goAdFreeToastTitle"),
              t("goAdFreeToastPremium"),
            );
          }
        }, 450);
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      if (!isEditing && (await isDeviceOffline())) {
        try {
          const description = resolveDescription();
          await enqueueOfflineExpense({
            amount: parseFloat(formData.amount),
            description,
            category_id: formData.category,
            payment_method: formData.paymentMethod,
            date: formData.date.toISOString(),
            board_id: formData.board,
          });
          showToast.success(t("expenseSavedOffline"), t("expenseSavedOfflineMessage"));
          navigation.goBack();
          return;
        } catch {
          // fall through
        }
      }
      await showNetworkAwareError(t("failedToSaveExpense"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = () => {
    navigation.navigate("CreateExpenseBoard", {
      onBoardCreated: (newBoardId) => {
        setFormData({ ...formData, board: newBoardId });
      },
    });
  };

  const handleCreateCategory = () => {
    navigation.navigate("AddCategory", {
      onCategoryCreated: (newCategoryId) => {
        setFormData({ ...formData, category: newCategoryId });
      },
    });
  };

  // --- Numeric keypad (builds the same amount string the old input did) ---
  const appendKeypad = (key) => {
    setFormData((prev) => {
      const current = prev.amount || "";
      let next = current;
      if (key === ".") {
        if (current.includes(".")) return prev;
        next = current === "" ? "0." : `${current}.`;
      } else if (key === "00") {
        if (current === "" || current === "0") return prev;
        next = `${current}00`;
      } else {
        next = current === "0" ? key : `${current}${key}`;
      }
      // Cap at 9 digits before the decimal to keep the hero readable.
      const [whole] = next.split(".");
      if (whole.length > 9) return prev;
      return { ...prev, amount: next };
    });
  };

  const backspaceAmount = () => {
    setFormData((prev) => ({
      ...prev,
      amount: (prev.amount || "").slice(0, -1),
    }));
  };

  const pickReceiptPhoto = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast.error(
          "Photo access needed",
          "Allow photo access to attach a receipt preview."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setReceiptPhoto({
        uri: asset.uri,
        name: asset.fileName || "receipt.jpg",
      });
    } catch (error) {
      console.error("Error picking receipt photo:", error);
      showToast.error("Could not open photos", "Please try again.");
    }
  };

  const amountNumber = parseFloat(formData.amount) || 0;
  const memberCount = Math.max(boardMembers.length, 1);
  const equalShare =
    memberCount > 0 ? Math.round((amountNumber / memberCount) * 100) / 100 : 0;
  const unequalTotal = boardMembers.reduce(
    (sum, member) => sum + (parseFloat(unequalShares[member.id]) || 0),
    0
  );
  const unequalRemaining =
    Math.round((amountNumber - unequalTotal) * 100) / 100;
  const payerName =
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split("@")[0] ||
    "You";

  const switchSplitMode = (mode) => {
    if (mode === "unequal" && boardMembers.length > 0) {
      const initial = {};
      boardMembers.forEach((member) => {
        initial[member.id] = String(equalShare);
      });
      setUnequalShares(initial);
    }
    setSplitMode(mode);
  };

  const renderAmountHero = () => (
    <View style={styles.amountHero}>
      <Text style={styles.amountLabel}>{t("amount")}</Text>
      <Text style={styles.amountDisplay} accessibilityLabel={`Amount ${formData.amount || "0"}`}>
        {`${getCurrencySymbol()}${formData.amount || "0.00"}`}
      </Text>
      <View style={styles.keypad}>
        {KEYPAD_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.keypadKey}
            onPress={() => appendKeypad(key)}
            accessibilityRole="button"
            accessibilityLabel={`Key ${key}`}
            activeOpacity={0.7}
          >
            <Text style={styles.keypadKeyText}>{key}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.keypadKey}
          onPress={backspaceAmount}
          accessibilityRole="button"
          accessibilityLabel="Delete last digit"
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="backspace-outline" size={24} color={K.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDescriptionInput = () => (
    <View style={styles.inputContainer}>
      <FormInput
        label={t("description")}
        value={formData.description}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder={t("enterDescription")}
        multiline
        inputStyle={styles.descriptionInput}
      />
    </View>
  );

  const renderPaidByAndSplit = () => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: theme.text }]}>Paid by</Text>
      <View style={styles.paidByRow}>
        <View style={styles.payerAvatar}>
          <Text style={styles.payerAvatarText}>
            {payerName.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.paidByText}>
          <Text style={[styles.payerName, { color: theme.text }]}>
            {payerName} (You)
          </Text>
          <Text style={[styles.payerNote, { color: theme.textSecondary }]}>
            Expenses are always recorded under your account.
          </Text>
        </View>
        <View style={styles.memberStack}>
          {boardMembers.slice(0, 4).map((member, index) => (
            <View
              key={member.id || index}
              style={[styles.memberAvatar, index > 0 && { marginLeft: -8 }]}
            >
              <Text style={styles.memberAvatarText}>
                {(member.name || "?").trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.splitToggle}>
        <TouchableOpacity
          style={[
            styles.splitToggleButton,
            splitMode === "equal" && styles.splitToggleButtonActive,
          ]}
          onPress={() => switchSplitMode("equal")}
          accessibilityRole="button"
          accessibilityState={{ selected: splitMode === "equal" }}
        >
          <Text
            style={[
              styles.splitToggleText,
              splitMode === "equal" && styles.splitToggleTextActive,
            ]}
          >
            Split Equally
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.splitToggleButton,
            splitMode === "unequal" && styles.splitToggleButtonActive,
          ]}
          onPress={() => switchSplitMode("unequal")}
          accessibilityRole="button"
          accessibilityState={{ selected: splitMode === "unequal" }}
        >
          <Text
            style={[
              styles.splitToggleText,
              splitMode === "unequal" && styles.splitToggleTextActive,
            ]}
          >
            Split Unequally
          </Text>
        </TouchableOpacity>
      </View>

      {boardMembers.length > 0 && amountNumber > 0 ? (
        <View style={styles.splitPreview}>
          {boardMembers.map((member) => {
            const isPayer = member.id === authUser?.id;
            const share =
              splitMode === "equal"
                ? equalShare
                : parseFloat(unequalShares[member.id]) || 0;
            return (
              <View key={member.id} style={styles.splitRow}>
                <View style={styles.splitMember}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(member.name || "?").trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.splitName, { color: theme.text }]} numberOfLines={1}>
                    {member.name}
                    {isPayer ? " (You)" : ""}
                  </Text>
                </View>
                {splitMode === "equal" ? (
                  <Text style={[styles.splitAmount, { color: theme.text }]}>
                    {formatCurrency(share)}
                  </Text>
                ) : (
                  <View style={styles.unequalInputWrap}>
                    <Text style={[styles.splitCurrency, { color: theme.textSecondary }]}>
                      {getCurrencySymbol()}
                    </Text>
                    <TextInput
                      value={unequalShares[member.id] || ""}
                      onChangeText={(text) => {
                        const numeric = text.replace(/[^0-9.]/g, "");
                        if (numeric.split(".").length > 2) return;
                        setUnequalShares((prev) => ({
                          ...prev,
                          [member.id]: numeric,
                        }));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.unequalInput, { color: theme.text }]}
                      accessibilityLabel={`Share for ${member.name}`}
                    />
                  </View>
                )}
              </View>
            );
          })}
          <Text style={[styles.splitNote, { color: theme.textSecondary }]}>
            {splitMode === "equal"
              ? `Split ${memberCount} ways · ${formatCurrency(equalShare)} each`
              : `₹${unequalRemaining.toFixed(2)} left to assign`}
          </Text>
          <Text style={[styles.splitNote, { color: theme.textSecondary }]}>
            Split preview only — the board settles every expense equally, and
            unequal shares aren&apos;t saved with the expense yet.
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderPhotoRow = () => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: theme.text }]}>Add Photo / Scan Receipt</Text>
      <TouchableOpacity
        style={[styles.photoButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={pickReceiptPhoto}
        accessibilityRole="button"
        accessibilityLabel="Add photo or scan receipt"
        activeOpacity={0.85}
      >
        <OcrScannerIcon size={24} />
        <View style={styles.photoButtonText}>
          <Text style={[styles.photoButtonTitle, { color: theme.text }]}>
            {receiptPhoto ? receiptPhoto.name : "Add a receipt photo"}
          </Text>
          <Text style={[styles.photoButtonSub, { color: theme.textSecondary }]}>
            Receipt scan coming soon — the photo is a preview only.
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
      {receiptPhoto ? (
        <View style={styles.photoPreview}>
          <Image source={{ uri: receiptPhoto.uri }} style={styles.photoThumb} />
          <Text style={[styles.photoName, { color: theme.textSecondary }]} numberOfLines={1}>
            {receiptPhoto.name}
          </Text>
          <TouchableOpacity
            onPress={() => setReceiptPhoto(null)}
            accessibilityRole="button"
            accessibilityLabel="Remove receipt photo"
            style={styles.photoRemove}
          >
            <MaterialCommunityIcons name="close-circle" size={22} color={theme.error} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  const renderPaymentMethodSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: theme.text }]}>{t("paymentMethod")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.value}
            style={[
              styles.categoryItem,
              {
                backgroundColor:
                  formData.paymentMethod === method.value
                    ? theme.primary
                    : theme.card,
                borderWidth: formData.paymentMethod === method.value ? 2 : 1,
                borderColor:
                  formData.paymentMethod === method.value
                    ? theme.primary
                    : theme.border,
              },
            ]}
            onPress={() =>
              setFormData({ ...formData, paymentMethod: method.value })
            }
          >
            <View
              style={[
                styles.categoryIcon,
                {
                  backgroundColor: `${method.color}15`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={method.icon}
                size={22}
                color={method.color}
              />
            </View>
            <Text
              style={[
                styles.categoryName,
                {
                  color:
                    formData.paymentMethod === method.value
                      ? theme.white
                      : theme.text,
                },
              ]}
            >
              {t(paymentMethodKeys[method.value] || method.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDateSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: theme.text }]}>{t("date")}</Text>
      <TouchableOpacity
        style={[
          styles.dateButton,
          {
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          },
        ]}
        onPress={() => setShowDatePicker(true)}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={theme.textSecondary}
        />
        <Text style={[styles.dateText, { color: theme.text }]}>
          {formData.date.toLocaleDateString()}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t("expenseDate")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              mode="single"
              date={formData.date}
              onChange={({ date }) => {
                setFormData({ ...formData, date });
                setShowDatePicker(false);
              }}
              styles={{
                ...defaultStyles,
                selected: { backgroundColor: theme.primary },
                selected_label: { color: theme.white },
                today: { borderColor: theme.primary },
                header: { backgroundColor: theme.card },
                headerText: { color: theme.text },
                weekdays: { color: theme.textSecondary },
                days: { color: theme.text },
                disabled: { color: theme.textSecondary },
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderSaveButton = () => (
    <ScreenActionBar>
      <TouchableOpacity
        onPress={handleSave}
        disabled={loading}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={isEditing ? "Update Expense" : t("saveExpense")}
        style={styles.saveButtonWrap}
      >
        <LinearGradient
          colors={K.coralGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.saveButton, loading && { opacity: 0.7 }]}
        >
          <Text style={styles.saveButtonText}>
            {loading
              ? "Saving…"
              : isEditing
                ? "Update Expense"
                : `${t("saveExpense")}${amountNumber > 0 ? ` (${formatCurrency(amountNumber)})` : ""}`}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScreenActionBar>
  );

  return (
    <ScreenLayout header={<Header
        title={isEditing ? "Edit Expense" : t("addExpense")}
        onBack={() => navigation.goBack()}
      />}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderAmountHero()}
          <ExpenseBoardList
            selectedBoard={formData.board}
            onSelectBoard={(boardId) => {
              setFormData({ ...formData, board: boardId });
            }}
            onCreateBoard={handleCreateBoard}
          />
          <CategoryList
            selectedCategory={formData.category}
            onSelectCategory={(categoryId) =>
              setFormData({ ...formData, category: categoryId })
            }
            onCreateCategory={handleCreateCategory}
          />
          {renderPaidByAndSplit()}
          {renderDateSelector()}
          {renderPaymentMethodSelector()}
          {renderDescriptionInput()}
          {renderPhotoRow()}
        </ScrollView>
      </KeyboardAvoidingView>
      {renderSaveButton()}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  inputContainer: {
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.8,
  },
  amountHero: {
    backgroundColor: K.navy,
    borderRadius: kinetic.radii.xl,
    padding: 20,
    paddingBottom: 12,
    marginBottom: 8,
    ...kinetic.shadows.elevated,
  },
  amountLabel: {
    ...kinetic.typography.captionBold,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  amountDisplay: {
    ...kinetic.typography.displayLarge,
    color: K.textInverse,
    textAlign: "center",
    marginTop: 4,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  keypadKey: {
    width: "25%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadKeyText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  descriptionInput: {
    padding: 12,
    borderRadius: 10,
    height: 100,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...shadowStyle(2),
    fontSize: 15,
  },
  categoriesList: {
    paddingRight: 12,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginRight: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...shadowStyle(2),
    minWidth: 100,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "600",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    ...shadowStyle(2),
  },
  dateText: {
    fontSize: 15,
    marginLeft: 8,
    fontWeight: "500",
  },
  saveButtonWrap: {
    flex: 1,
  },
  saveButton: {
    borderRadius: kinetic.radii.full,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    ...kinetic.shadows.ctaCoral,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  paidByRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 12,
  },
  payerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: K.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  payerAvatarText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  paidByText: {
    flex: 1,
    marginLeft: 12,
  },
  payerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  payerNote: {
    fontSize: 12,
    marginTop: 2,
  },
  memberStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D6E4ED",
    borderWidth: 2,
    borderColor: K.card,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: K.navy,
  },
  splitToggle: {
    flexDirection: "row",
    backgroundColor: K.subtle,
    borderRadius: kinetic.radii.full,
    padding: 4,
    marginTop: 12,
  },
  splitToggleButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: kinetic.radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  splitToggleButtonActive: {
    backgroundColor: K.navy,
  },
  splitToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: K.textSecondary,
  },
  splitToggleTextActive: {
    color: "#FFFFFF",
  },
  splitPreview: {
    marginTop: 12,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 12,
  },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: K.subtle,
  },
  splitMember: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  splitName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  unequalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.sm,
    paddingHorizontal: 8,
    minHeight: 44,
    minWidth: 110,
  },
  splitCurrency: {
    fontSize: 14,
    fontWeight: "600",
  },
  unequalInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 8,
    textAlign: "right",
  },
  splitNote: {
    fontSize: 12,
    marginTop: 8,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: kinetic.radii.lg,
    padding: 12,
    gap: 12,
  },
  photoButtonText: {
    flex: 1,
  },
  photoButtonTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  photoButtonSub: {
    fontSize: 12,
    marginTop: 2,
  },
  photoPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: kinetic.radii.md,
  },
  photoName: {
    flex: 1,
    fontSize: 13,
  },
  photoRemove: {
    padding: 4,
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    ...shadowStyle(5),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
});
