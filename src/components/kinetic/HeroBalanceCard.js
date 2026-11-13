import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { kinetic } from "../../theme/tokens";

/**
 * Net-position hero card (Dashboard flagship, zip code.html).
 * Navy gradient #002847 → #003D66 → #004D80, white display figure,
 * "Smart Settle" coral pill, dual You-are-owed / You-owe chips.
 * All amounts come from props — the caller wires real balances, never
 * demo figures. Net >= 0 shows the green "You will receive" line;
 * net < 0 shows the red "You owe" line.
 */
export function HeroBalanceCard({
  netPosition = 0,
  owedToYou = 0,
  youOwe = 0,
  formatAmount,
  onSmartSettle,
  testID = "hero-balance-card",
}) {
  const fmt =
    formatAmount || ((v) => `₹${Math.abs(Number(v) || 0).toLocaleString("en-IN")}`);
  const net = Number(netPosition) || 0;
  const isPositive = net >= 0;

  return (
    <LinearGradient
      testID={testID}
      colors={kinetic.colors.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.netBlock}>
          <Text style={styles.label}>NET POSITION</Text>
          <Text style={styles.netAmount} accessibilityRole="header">
            {isPositive ? "+" : "-"}
            {fmt(net).replace("₹", "₹")}
          </Text>
          <Text
            style={[
              styles.netNote,
              { color: isPositive ? "#62DF7D" : "#FFB690" },
            ]}
          >
            {isPositive
              ? `You will receive ${fmt(net)} overall`
              : `You owe ${fmt(net)} overall`}
          </Text>
        </View>
        {onSmartSettle ? (
          <TouchableOpacity
            onPress={onSmartSettle}
            style={styles.smartSettle}
            accessibilityRole="button"
            accessibilityLabel="Settle debts instantly via UPI"
            testID="hero-smart-settle"
          >
            <MaterialCommunityIcons name="auto-fix" size={16} color="#FFFFFF" />
            <Text style={styles.smartSettleText}>Smart Settle</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <View style={styles.chipHeader}>
            <Text style={styles.chipLabel}>YOU ARE OWED</Text>
            <MaterialCommunityIcons
              name="arrow-top-right"
              size={16}
              color="#62DF7D"
            />
          </View>
          <Text style={[styles.chipAmount, { color: "#7FFC97" }]}>
            {fmt(owedToYou)}
          </Text>
        </View>
        <View style={styles.chip}>
          <View style={styles.chipHeader}>
            <Text style={styles.chipLabel}>YOU OWE</Text>
            <MaterialCommunityIcons
              name="arrow-bottom-right"
              size={16}
              color="#FFB690"
            />
          </View>
          <Text style={[styles.chipAmount, { color: "#FFDBCA" }]}>
            {fmt(youOwe)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: kinetic.radii.lg,
    padding: 20,
    ...kinetic.shadows.elevated,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  netBlock: { flex: 1, marginRight: 12 },
  label: {
    ...kinetic.typography.captionBold,
    color: "#7DA8D7",
    letterSpacing: 0.6,
  },
  netAmount: {
    ...kinetic.typography.displayLarge,
    color: kinetic.colors.textInverse,
    marginTop: 4,
  },
  netNote: {
    ...kinetic.typography.captionBold,
    marginTop: 6,
  },
  smartSettle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: kinetic.colors.coral,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  smartSettleText: {
    ...kinetic.typography.captionBold,
    color: kinetic.colors.textInverse,
    marginLeft: 4,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  chip: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: kinetic.radii.md,
    padding: 12,
  },
  chipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipLabel: {
    ...kinetic.typography.captionBold,
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.5,
  },
  chipAmount: {
    ...kinetic.typography.headingLarge,
    marginTop: 4,
  },
});
