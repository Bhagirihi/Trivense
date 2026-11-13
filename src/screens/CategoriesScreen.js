import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { devLog } from "../utils/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { ScreenActionBar } from "../components/ui/ScreenActionBar";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { categoryService } from "../services/categoryService";
import { getAccessibleBoardIds } from "../services/boardAccessService";
import { supabase } from "../config/supabase";
import { showToast } from "../utils/toast";
import { realTimeSync } from "../services/realTimeSync";
import { sendDeleteCategoryNotification } from "../services/pushNotificationService";
import { useTranslation } from "../hooks/useTranslation";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { useAdPolicy } from "../context/AdPolicyContext";
import InlineListAd from "../components/InlineListAd";
import { SponsoredAdSlot } from "../components/kinetic/SponsoredAdSlot";
import {
  interleaveListWithAds,
  isAdListItem,
} from "../utils/listWithAds";
import { LIST_AD_INTERVAL_CATEGORIES } from "../config/admob";
import { kinetic } from "../theme/tokens";

const K = kinetic.colors;

export const CategoriesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isAdFree } = useAdEntitlement();
  const { showBannerAds } = useAdPolicy();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  // categoryId -> real expense count (null = counts failed to load).
  const [expenseCounts, setExpenseCounts] = useState(null);

  const fetchExpenseCounts = useCallback(async () => {
    try {
      const boardIds = await getAccessibleBoardIds();
      if (!boardIds || boardIds.length === 0) {
        setExpenseCounts({});
        return;
      }
      const { data, error } = await supabase
        .from("expenses")
        .select("category_id")
        .in("board_id", boardIds);
      if (error) throw error;
      const counts = {};
      for (const row of data || []) {
        if (!row.category_id) continue;
        counts[row.category_id] = (counts[row.category_id] || 0) + 1;
      }
      setExpenseCounts(counts);
    } catch (error) {
      console.error("Error fetching category expense counts:", error);
      setExpenseCounts(null);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    devLog("🔄 Starting to fetch categories...");
    try {
      const data = await categoryService.getCategories();

      if (!data) {
        devLog("No categories found");
        setCategories([]);
        return;
      }

      setCategories(data);
    } catch (error) {
      console.error("Error in fetchCategories:", error);
      showToast.error("Failed to fetch categories");
      setCategories([]);
    } finally {
      devLog("🏁 Category fetching process completed");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchExpenseCounts();
  }, [fetchCategories, fetchExpenseCounts]);

  useEffect(() => {
    fetchCategories();
    const cleanup = realTimeSync.subscribeToCategory(fetchCategories);
    return () => {
      if (cleanup && typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [fetchCategories]);

  const isDefaultCategory = (category) =>
    String(category.id || "").startsWith("default-") ||
    category.is_default === true;

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? categories.filter((c) =>
          String(c.name || "").toLowerCase().includes(q)
        )
      : categories;
    if (filter === "default") {
      list = list.filter(isDefaultCategory);
    } else if (filter === "custom") {
      list = list.filter((c) => !isDefaultCategory(c));
    }
    return list;
  }, [categories, searchQuery, filter]);

  const categoryListData = useMemo(() => {
    if (!showBannerAds || isAdFree || filteredCategories.length === 0) {
      return filteredCategories;
    }
    return interleaveListWithAds(filteredCategories, {
      interval: LIST_AD_INTERVAL_CATEGORIES,
      adKeyPrefix: "category-ad",
    });
  }, [filteredCategories, isAdFree, showBannerAds]);

  const defaultCount = useMemo(
    () => categories.filter(isDefaultCategory).length,
    [categories]
  );
  const customCount = categories.length - defaultCount;

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

  const renderFilterChip = (key, label, count) => {
    const selected = filter === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => setFilter(key)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCategoryTile = (item) => {
    const count =
      expenseCounts === null ? null : expenseCounts[item.id] || 0;
    const isDefault = isDefaultCategory(item);
    return (
      <View key={item.id} style={styles.tile}>
        <View style={[styles.tileIcon, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon} size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.tileName} numberOfLines={2}>
          {item.name}
        </Text>
        {count !== null ? (
          <Text style={styles.tileCount}>
            {count === 0
              ? "No expenses yet"
              : `${count} ${count === 1 ? "expense" : "expenses"}`}
          </Text>
        ) : null}
        {item.description ? (
          <Text style={styles.tileDescription} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.tileActions}>
          <TouchableOpacity
            style={styles.tileActionBtn}
            onPress={() => navigation.navigate("AddCategory", { category: item })}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={K.navy}
            />
            <Text style={styles.tileActionText}>Edit</Text>
          </TouchableOpacity>
          {!isDefault ? (
            <TouchableOpacity
              style={styles.tileActionBtn}
              onPress={() => handleDelete(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
            >
              <MaterialCommunityIcons
                name="delete"
                size={18}
                color={K.danger}
              />
              <Text style={[styles.tileActionText, { color: K.danger }]}>
                Delete
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenLayout header={<Header title={t("categories")} onBack={() => navigation.goBack()} />}>
      {loading ? (
        <AnimatedLoader context="categories" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
        >
          <View style={styles.searchBox}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={K.textSecondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search categories…"
              placeholderTextColor={K.textSecondary}
              accessibilityLabel="Search categories"
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={K.textSecondary}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.chipRow}>
            {renderFilterChip("all", "All", categories.length)}
            {renderFilterChip("default", "Default", defaultCount)}
            {renderFilterChip("custom", "Custom", customCount)}
          </View>

          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="folder-outline"
                size={48}
                color={K.textSecondary}
              />
              <Text style={styles.emptyStateText}>
                No categories yet. Tap Add Category to create one.
              </Text>
            </View>
          ) : filteredCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="magnify"
                size={48}
                color={K.textSecondary}
              />
              <Text style={styles.emptyStateText}>
                No categories match your search.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                All Categories ({filteredCategories.length})
              </Text>
              <View style={styles.grid}>
                {categoryListData.map((item) =>
                  isAdListItem(item) ? (
                    <View key={item.id} style={styles.adWrap}>
                      <SponsoredAdSlot>
                        <InlineListAd />
                      </SponsoredAdSlot>
                    </View>
                  ) : (
                    renderCategoryTile(item)
                  )
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
      <ScreenActionBar>
        <TouchableOpacity
          onPress={() => navigation.navigate("AddCategory")}
          accessibilityRole="button"
          accessibilityLabel={t("addCategory") || "Add category"}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={K.coralGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.addButton, kinetic.shadows.ctaCoral]}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              {t("addCategory") || "Add Category"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScreenActionBar>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    backgroundColor: K.canvas,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.md,
    paddingHorizontal: 12,
    backgroundColor: K.card,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: K.textPrimary,
    ...kinetic.typography.body,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: kinetic.radii.full,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    minHeight: 36,
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: K.navy,
    borderColor: K.navy,
  },
  chipText: {
    ...kinetic.typography.caption,
    fontWeight: "600",
    color: K.textSecondary,
  },
  chipTextSelected: { color: K.textInverse },
  sectionTitle: {
    ...kinetic.typography.headingMedium,
    color: K.textPrimary,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    ...kinetic.shadows.card,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: kinetic.radii.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  tileName: {
    ...kinetic.typography.headingSmall,
    color: K.textPrimary,
    marginBottom: 4,
  },
  tileCount: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
  },
  tileDescription: {
    ...kinetic.typography.caption,
    color: K.textTertiary,
    marginTop: 2,
  },
  tileActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: K.border,
  },
  tileActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    gap: 4,
    backgroundColor: K.subtle,
    borderRadius: kinetic.radii.md,
  },
  tileActionText: {
    ...kinetic.typography.bodyMedium,
    color: K.navy,
  },
  adWrap: { width: "100%" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: kinetic.radii.full,
    gap: 8,
  },
  addButtonText: {
    ...kinetic.typography.headingSmall,
    color: "#FFFFFF",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingVertical: 48,
  },
  emptyStateText: {
    ...kinetic.typography.body,
    color: K.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
});
