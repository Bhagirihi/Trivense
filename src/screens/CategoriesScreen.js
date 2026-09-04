import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { categoryService } from "../services/categoryService";
import ListHeader from "../components/common/ListHeader";
import { showToast } from "../utils/toast";
import { AddCategoryScreen } from "./AddCategoryScreen";
import { realTimeSync } from "../services/realTimeSync";
import { sendDeleteCategoryNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { useAdPolicy } from "../context/AdPolicyContext";
import InlineListAd from "../components/InlineListAd";
import {
  interleaveListWithAds,
  isAdListItem,
} from "../utils/listWithAds";
import { LIST_AD_INTERVAL_CATEGORIES } from "../config/admob";

const DEFAULT_CATEGORIES = [
  {
    id: "default-1",
    name: "Food",
    icon: "food",
    color: "#FF6B6B",
    description: "Food and dining expenses",
  },
  {
    id: "default-2",
    name: "Transport",
    icon: "car",
    color: "#4ECDC4",
    description: "Transportation costs",
  },
  {
    id: "default-3",
    name: "Shopping",
    icon: "shopping",
    color: "#45B7D1",
    description: "Shopping and retail",
  },
  {
    id: "default-4",
    name: "Entertainment",
    icon: "movie",
    color: "#96CEB4",
    description: "Entertainment and leisure",
  },
  {
    id: "default-5",
    name: "Health",
    icon: "heart",
    color: "#FFEEAD",
    description: "Health and medical expenses",
  },
  {
    id: "default-6",
    name: "Education",
    icon: "book",
    color: "#D4A5A5",
    description: "Education and learning",
  },
  {
    id: "default-7",
    name: "Housing",
    icon: "home",
    color: "#9B59B6",
    description: "Housing and utilities",
  },
  {
    id: "default-8",
    name: "Travel",
    icon: "airplane",
    color: "#3498DB",
    description: "Travel and tourism",
  },
];

const CATEGORY_COLORS = [
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {},
    }),
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {},
    }),
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  categoryActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {},
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  colorList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    margin: 4,
    padding: 8,
    borderWidth: 1,
  },
  iconLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export const CategoriesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isAdFree } = useAdEntitlement();
  const { showBannerAds } = useAdPolicy();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryListData = useMemo(() => {
    if (!showBannerAds || isAdFree || categories.length === 0) return categories;
    return interleaveListWithAds(categories, {
      interval: LIST_AD_INTERVAL_CATEGORIES,
      adKeyPrefix: "category-ad",
    });
  }, [categories, isAdFree, showBannerAds]);

  const fetchCategories = useCallback(async () => {
    console.log("🔄 Starting to fetch categories...");
    try {
      const data = await categoryService.getCategories();

      if (!data) {
        console.log("No categories found");
        setCategories([]);
        return;
      }

      setCategories(data);
    } catch (error) {
      console.error("Error in fetchCategories:", error);
      showToast.error("Failed to fetch categories");
      setCategories([]);
    } finally {
      console.log("🏁 Category fetching process completed");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchCategories();
    const cleanup = realTimeSync.subscribeToCategory(fetchCategories);
    return () => {
      if (cleanup && typeof cleanup === "function") {
        cleanup();
      }
    };
  }, []);

  const handleDelete = async (categoryId) => {
    try {
      const categoryToDelete = categories.find((cat) => cat.id === categoryId);
      const { error } = await categoryService.deleteCategory(categoryId);
      if (error) {
        showToast.error("Failed to delete category");
        return;
      }

      // Send notification for category deletion
      await sendDeleteCategoryNotification({
        boardName: "Categories",
        icon: categoryToDelete.icon,
        iconColor: categoryToDelete.color,
        categoryName: categoryToDelete.name,
      });

      showToast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      showToast.error("Failed to delete category");
    }
  };

  const renderCategoryItem = ({ item }) => (
    <View style={[styles.categoryItem, { backgroundColor: theme.card }]}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <MaterialCommunityIcons name={item.icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: theme.text }]}>
          {item.name}
        </Text>
        {item.description && (
          <Text
            style={[styles.categoryDescription, { color: theme.textSecondary }]}
          >
            {item.description}
          </Text>
        )}
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("AddCategory", { category: item })}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
        {!item.id.startsWith("default-") && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id)}
          >
            <MaterialCommunityIcons
              name="delete"
              size={20}
              color={theme.error}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScreenLayout header={<Header title={t("categories")} onBack={() => navigation.goBack()} />}>
      {loading ? (
        <AnimatedLoader context="categories" />
      ) : categories.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="folder-outline"
            size={48}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyStateText, { color: theme.text }]}>
            No categories yet. Tap the + button to create one.
          </Text>
        </View>
      ) : (
        <FlatList
          data={categoryListData}
          renderItem={({ item }) =>
            isAdListItem(item) ? (
              <InlineListAd />
            ) : (
              renderCategoryItem({ item })
            )
          }
          keyExtractor={(item) =>
            isAdListItem(item) ? item.id : item.id
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ListHeader
              title={t("categories")}
              subtitle={`${categories.length} ${t("categoriesCount")}`}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: theme.primary,
            bottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
        onPress={() => navigation.navigate("AddCategory")}
      >
        <MaterialCommunityIcons name="plus" size={24} color={theme.white} />
      </TouchableOpacity>
    </ScreenLayout>
  );
};
