import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { ScreenActionBar } from "../components/ui/ScreenActionBar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { categoryService } from "../services/categoryService";
import { showToast } from "../utils/toast";
import {
  sendCreateCategoryNotification,
  sendUpdateCategoryNotification,
} from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useSubscription } from "../context/SubscriptionContext";
import { subscriptionService } from "../services/subscriptionService";
import { supabase } from "../config/supabase";
import { FEATURES } from "../config/subscriptionPlans";
import { kinetic } from "../theme/tokens";

const K = kinetic.colors;

// Constants
const CATEGORY_COLORS = [
  { id: "red", value: "#FF6B6B", label: "Red" },
  { id: "teal", value: "#4ECDC4", label: "Teal" },
  { id: "blue", value: "#45B7D1", label: "Blue" },
  { id: "green", value: "#96CEB4", label: "Green" },
  { id: "yellow", value: "#FFEEAD", label: "Yellow" },
  { id: "pink", value: "#D4A5A5", label: "Pink" },
  { id: "purple", value: "#9B59B6", label: "Purple" },
  { id: "navy", value: "#3498DB", label: "Navy" },
  { id: "orange", value: "#E67E22", label: "Orange" },
  { id: "mint", value: "#1ABC9C", label: "Mint" },
];

const CATEGORY_ICONS = [
  { id: "food", name: "food", label: "Food" },
  { id: "transport", name: "car", label: "Transport" },
  { id: "shopping", name: "shopping", label: "Shopping" },
  { id: "entertainment", name: "movie", label: "Entertainment" },
  { id: "utilities", name: "flash", label: "Utilities" },
  { id: "health", name: "heart", label: "Health" },
  { id: "education", name: "book", label: "Education" },
  { id: "housing", name: "home", label: "Housing" },
  { id: "travel", name: "airplane", label: "Travel" },
  { id: "other", name: "dots-horizontal", label: "Other" },
];

const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

export const AddCategoryScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { subscription, requireFeature } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: CATEGORY_COLORS[0],
    icon: CATEGORY_ICONS[0],
  });
  const [errors, setErrors] = useState({});
  // Monthly budget is display-only for now: the categories table has no
  // budget column, so this value is not sent to categoryService (see report).
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState("");

  // Initialize form data if editing existing category
  useEffect(() => {
    if (route.params?.category) {
      const { category } = route.params;
      setFormData({
        name: category.name,
        description: category.description || "",
        color:
          CATEGORY_COLORS.find((c) => c.value === category.color) ||
          CATEGORY_COLORS[0],
        icon:
          CATEGORY_ICONS.find((i) => i.name === category.icon) ||
          CATEGORY_ICONS[0],
      });
    }
  }, [route.params, route.params?.category]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    } else if (formData.name.length > MAX_NAME_LENGTH) {
      newErrors.name = `Category name must be less than ${MAX_NAME_LENGTH} characters`;
    }

    if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color.value,
        icon: formData.icon.name,
      };

      if (route.params?.category) {
        await categoryService.updateCategory(
          route.params.category.id,
          categoryData
        );

        await sendUpdateCategoryNotification({
          boardName: "Categories",
          icon: formData.icon.name,
          iconColor: formData.color.value,
          categoryName: formData.name.trim(),
        });

        showToast.success("Category updated successfully");

        if (route.params?.onCategoryCreated) {
          route.params.onCategoryCreated(route.params.category.id);
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const categoryCheck = await subscriptionService.canCreateCustomCategory(
          subscription,
          user.id
        );
        if (!categoryCheck.allowed) {
          requireFeature(FEATURES.UNLIMITED_CATEGORIES, navigation);
          return;
        }

        const created = await categoryService.createCategory(categoryData);

        await sendCreateCategoryNotification({
          boardName: "Categories",
          icon: formData.icon.name,
          iconColor: formData.color.value,
          categoryName: formData.name.trim(),
        });

        showToast.success("Category created successfully");

        if (route.params?.onCategoryCreated && created?.id) {
          route.params.onCategoryCreated(created.id);
        }
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error saving category:", error);
      showToast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderColorPicker = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{t("chooseColor")}</Text>
      <View style={styles.colorList}>
        {CATEGORY_COLORS.map((color) => {
          const selected = formData.color.id === color.id;
          return (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorItem,
                { backgroundColor: color.value || theme.card },
                selected && {
                  borderWidth: 3,
                  borderColor: K.coral,
                },
              ]}
              onPress={() => setFormData((prev) => ({ ...prev, color }))}
              accessibilityRole="button"
              accessibilityLabel={`${color.label} color`}
              accessibilityState={{ selected }}
            >
              {selected && (
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
  const sortedIcons = CATEGORY_ICONS.sort((a, b) => {
    if (a.id === "other") return 1; // Push "other" to the end
    if (b.id === "other") return -1;
    return a.label.length - b.label.length; // Sort by label length
  });

  const renderIconPicker = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{t("chooseIcon")}</Text>
      <View style={styles.iconList}>
        {sortedIcons.map((icon) => {
          const selected = formData.icon.id === icon.id;
          return (
            <TouchableOpacity
              key={icon.id}
              style={[
                styles.iconItem,
                {
                  backgroundColor: selected ? K.coral : K.card,
                  borderColor: selected ? K.coral : K.border,
                },
              ]}
              onPress={() => setFormData((prev) => ({ ...prev, icon }))}
              accessibilityRole="button"
              accessibilityLabel={`${icon.label} icon`}
              accessibilityState={{ selected }}
            >
              <MaterialCommunityIcons
                name={icon.name}
                size={24}
                color={selected ? "#FFFFFF" : K.textPrimary}
              />
              <Text
                style={[
                  styles.iconLabel,
                  { color: selected ? "#FFFFFF" : K.textSecondary },
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

  const renderBudgetSection = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Budget (optional)</Text>
      <View style={styles.budgetCard}>
        <View style={styles.budgetRow}>
          <View style={styles.budgetTextCol}>
            <Text style={styles.budgetTitle}>Set monthly budget</Text>
            <Text style={styles.budgetSub}>
              Get alerted when spending nears the limit
            </Text>
          </View>
          <Switch
            value={budgetEnabled}
            onValueChange={setBudgetEnabled}
            trackColor={{ false: K.borderStrong, true: K.coral }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Set monthly budget"
          />
        </View>
        {budgetEnabled ? (
          <View style={styles.budgetInputRow}>
            <Text style={styles.budgetCurrency}>₹</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder="5,000"
              placeholderTextColor={K.textTertiary}
              value={monthlyBudget}
              onChangeText={(text) =>
                setMonthlyBudget(text.replace(/[^0-9.]/g, ""))
              }
              keyboardType="numeric"
              accessibilityLabel="Monthly budget amount"
            />
            <Text style={styles.budgetSuffix}>/ month</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScreenLayout header={<Header
        title={route.params?.category ? t("editCategory") : t("addCategory")}
        onBack={() => navigation.goBack()}
      />}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewCard}>
          <View
            style={[
              styles.previewIcon,
              { backgroundColor: formData.color.value },
            ]}
          >
            <MaterialCommunityIcons
              name={formData.icon.name}
              size={28}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.previewTextCol}>
            <Text style={styles.previewLabel}>Preview Badge</Text>
            <Text style={styles.previewName} numberOfLines={1}>
              {formData.name.trim() || "Your category name"}
            </Text>
            <Text style={styles.previewSub}>Active in Splits and Budgets</Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            {t("name")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: errors.name ? K.danger : K.border,
              },
            ]}
            placeholder={t("enterCategoryName")}
            placeholderTextColor={K.textSecondary}
            value={formData.name}
            onChangeText={(text) => {
              setFormData((prev) => ({ ...prev, name: text }));
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            maxLength={MAX_NAME_LENGTH}
          />
          {errors.name && (
            <Text style={[styles.errorText, { color: K.danger }]}>
              {errors.name}
            </Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t("description")}</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: errors.description ? K.danger : K.border,
                height: 100,
              },
            ]}
            placeholder={t("boardDescription")}
            placeholderTextColor={K.textSecondary}
            value={formData.description}
            onChangeText={(text) => {
              setFormData((prev) => ({ ...prev, description: text }));
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            multiline
            numberOfLines={3}
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          {errors.description && (
            <Text style={[styles.errorText, { color: K.danger }]}>
              {errors.description}
            </Text>
          )}
        </View>

        {renderIconPicker()}
        {renderColorPicker()}
        {renderBudgetSection()}
      </ScrollView>

      <ScreenActionBar>
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t("save")}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={K.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButton, kinetic.shadows.ctaCoral]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.saveButtonText}>Save Category</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScreenActionBar>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: K.canvas,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    ...kinetic.shadows.card,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: kinetic.radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTextCol: { flex: 1, minWidth: 0 },
  previewLabel: {
    ...kinetic.typography.captionBold,
    color: K.textTertiary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  previewName: {
    ...kinetic.typography.headingMedium,
    color: K.textPrimary,
    marginTop: 2,
  },
  previewSub: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
    marginTop: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: kinetic.radii.md,
    fontSize: 16,
    borderWidth: 1,
    backgroundColor: K.card,
    color: K.textPrimary,
    minHeight: 52,
  },
  colorList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    margin: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  iconList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  iconItem: {
    width: "auto",
    minWidth: 80,
    height: 64,
    borderRadius: kinetic.radii.md,
    justifyContent: "center",
    alignItems: "center",
    margin: 4,
    padding: 10,
    borderWidth: 1,
  },
  iconLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  budgetCard: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    ...kinetic.shadows.card,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  budgetTextCol: { flex: 1 },
  budgetTitle: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
  },
  budgetSub: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
    marginTop: 2,
  },
  budgetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.md,
    backgroundColor: K.subtle,
    paddingHorizontal: 12,
    marginTop: 12,
    minHeight: 52,
  },
  budgetCurrency: {
    ...kinetic.typography.headingMedium,
    color: K.textPrimary,
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    fontSize: 16,
    color: K.textPrimary,
    paddingVertical: 12,
  },
  budgetSuffix: {
    ...kinetic.typography.body,
    color: K.textSecondary,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: kinetic.radii.full,
  },
  saveButtonText: {
    ...kinetic.typography.headingSmall,
    color: "#FFFFFF",
  },
});
