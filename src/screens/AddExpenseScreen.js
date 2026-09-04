import React, { useState, useEffect } from "react";
import { shadowStyle } from "../utils/platformStyles";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { CategoryList } from "../components/CategoryList";
import { ExpenseBoardList } from "../components/ExpenseBoardList";
import FormInput from "../components/common/FormInput";
import FormButton from "../components/common/FormButton";
import { ScreenActionBar } from "../components/ui/ScreenActionBar";
import { expenseService } from "../services/expenseService";
import { supabase } from "../config/supabase";
import { showToast, showNetworkAwareError } from "../utils/toast";
import { sendCreateExpenseNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useAppSettings } from "../context/AppSettingsContext";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import {
  registerExpenseSaveForAd,
  showExpenseInterstitialAfterLeave,
  getSessionInterstitialCount,
} from "../services/adService";
import { getCurrencySymbol } from "../utils/formatters";
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

export const AddExpenseScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { currency } = useAppSettings();
  const { t } = useTranslation();
  const { isAdFree } = useAdEntitlement();
  const editingExpense = route.params?.expense;
  const editingExpenseId = route.params?.expenseId || editingExpense?.id;
  const isEditing = Boolean(editingExpenseId);
  const presetBoardId = route.params?.boardId;
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

  useEffect(() => {
    if (presetBoardId) {
      setFormData((prev) => ({ ...prev, board: presetBoardId }));
    }
  }, [presetBoardId]);

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

  const renderAmountInput = () => (
    <View style={styles.inputContainer}>
      <FormInput
        label={t("amount")}
        value={formData.amount}
        onChangeText={(text) => {
          // Only allow numbers and decimal point
          const numericValue = text.replace(/[^0-9.]/g, "");
          // Ensure only one decimal point
          const parts = numericValue.split(".");
          if (parts.length > 2) return;
          setFormData({ ...formData, amount: numericValue });
        }}
        placeholder={t("enterAmount")}
        keyboardType="numeric"
        prefix={getCurrencySymbol()}
      />
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
      <FormButton
        title={isEditing ? "Update Expense" : t("saveExpense")}
        onPress={handleSave}
        loading={loading}
        style={styles.saveButton}
      />
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
          <ExpenseBoardList
            selectedBoard={formData.board}
            onSelectBoard={(boardId) => {
              setFormData({ ...formData, board: boardId });
            }}
            onCreateBoard={handleCreateBoard}
          />
          {renderDateSelector()}
          {renderAmountInput()}
          {renderPaymentMethodSelector()}
          <CategoryList
            selectedCategory={formData.category}
            onSelectCategory={(categoryId) =>
              setFormData({ ...formData, category: categoryId })
            }
            onCreateCategory={handleCreateCategory}
          />
          {renderDescriptionInput()}
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
  amountInput: {
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
  currency: {
    fontSize: 22,
    marginRight: 6,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    fontSize: 22,
    padding: 0,
    fontWeight: "600",
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
  saveButton: {
    marginTop: 0,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    ...shadowStyle(3),
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
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
