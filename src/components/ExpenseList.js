import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ExpenseItem from "./ExpenseItem";
import InlineListAd from "./InlineListAd";
import { useAdEntitlement } from "../hooks/useAdEntitlement";
import { useAdPolicy } from "../context/AdPolicyContext";
import {
  interleaveListWithAds,
  insertSingleListAd,
  isAdListItem,
} from "../utils/listWithAds";
import { LIST_AD_INTERVAL_TRANSACTIONS } from "../config/admob";
import { radii, spacing, typography } from "../theme/tokens";

const ExpenseList = memo(
  ({
    expenses,
    onExpensePress,
    title,
    showAllButton = true,
    onDeletePress,
    onSeeAllPress,
    showHeader = true,
    showEmptyState = true,
    navigation,
    embedded = false,
    compact = false,
    containerStyle,
    showInlineAds = false,
    inlineAdMode = "interval",
    inlineAdInterval = LIST_AD_INTERVAL_TRANSACTIONS,
  }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { isAdFree } = useAdEntitlement();
    const { showBannerAds } = useAdPolicy();

    const listData = useMemo(() => {
      if (!showInlineAds || !showBannerAds || isAdFree || expenses.length === 0) {
        return expenses;
      }
      if (inlineAdMode === "single") {
        return insertSingleListAd(expenses, Math.min(1, expenses.length - 1));
      }
      return interleaveListWithAds(expenses, { interval: inlineAdInterval });
    }, [
      expenses,
      showInlineAds,
      showBannerAds,
      isAdFree,
      inlineAdMode,
      inlineAdInterval,
    ]);

    // Memoize the renderItem callback
    const renderItem = useCallback(
      ({ item }) => {
        if (isAdListItem(item)) {
          return <InlineListAd />;
        }
        return (
          <ExpenseItem
            expense={item}
            compact={compact}
            onPress={() => onExpensePress(item)}
            onDelete={() => onDeletePress(item.id)}
          />
        );
      },
      [onExpensePress, onDeletePress, compact]
    );

    const keyExtractor = useCallback(
      (item) => (isAdListItem(item) ? item.id : item.id.toString()),
      []
    );

    // Memoize the styles
    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            flex: 1,
            backgroundColor: theme.background,
          },
          embeddedContainer: {
            flex: 0,
          },
          list: {
            flex: 1,
          },
          header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: compact ? 0 : 12,
            paddingTop: compact ? 0 : 4,
            paddingBottom: compact ? spacing.sm : 10,
            backgroundColor: theme.background,
          },
          headerTitle: {
            ...(compact ? typography.label : typography.h3),
            color: theme.text,
            opacity: compact ? 1 : 0.9,
          },
          seeAllButton: {
            padding: compact ? 4 : 8,
          },
          seeAllText: {
            color: theme.primary,
            fontSize: compact ? 13 : 16,
            fontWeight: "600",
          },
          emptyContainer: {
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backgroundColor: theme.cardBackground,
            borderRadius: 16,
            marginHorizontal: 20,
            marginVertical: 10,
          },
          emptyText: {
            fontSize: 16,
            marginTop: 12,
            textAlign: "center",
            color: theme.textSecondary,
          },
          createButton: {
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 12,
            marginTop: 16,
            backgroundColor: theme.primary,
          },
          createButtonText: {
            fontSize: 14,
            fontWeight: "600",
            marginLeft: 8,
            color: theme.white,
          },
        }),
      [
        theme.background,
        theme.text,
        theme.primary,
        theme.textSecondary,
        theme.card,
        theme.white,
        compact,
      ]
    );

    const renderHeader = () => {
      if (!showHeader) return null;

      return (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {title ? title : t("transactions")}
          </Text>
          {showAllButton && expenses.length > 0 && (
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={onSeeAllPress}
            >
              <Text style={styles.seeAllText}>{t("seeAll")}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    };

    const renderEmptyState = () => {
      if (!showEmptyState) return null;

      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="receipt"
            size={48}
            color={theme.textSecondary}
          />
          <Text style={styles.emptyText}>{t("noTransactionsFound")}</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate("AddExpense")}
          >
            <MaterialCommunityIcons name="plus" size={24} color={theme.white} />
            <Text style={styles.createButtonText}>{t("addTransaction")}</Text>
          </TouchableOpacity>
        </View>
      );
    };

    if (embedded) {
      return (
        <View style={[styles.container, styles.embeddedContainer, containerStyle]}>
          {renderHeader()}
          {listData.length === 0
            ? renderEmptyState()
            : listData.map((item) => (
                <View key={keyExtractor(item)}>
                  {renderItem({ item })}
                </View>
              ))}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {renderHeader()}

        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.list}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    );
  }
);

export default ExpenseList;
