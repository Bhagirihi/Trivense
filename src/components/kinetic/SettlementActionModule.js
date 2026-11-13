import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { kinetic } from "../../theme/tokens";
import {
  AiSparkleIcon,
  CashDoubleCheckIcon,
  UpiLightningIcon,
  WhatsAppNudgeIcon,
} from "./SettlementIcons";

/**
 * Settlement action module — handoff token spec §5 (production parity).
 * Greedy AI pill ("Collapses N dues into 1 transfer"), dual 48px CTAs
 * (Request UPI coral gradient / WhatsApp Nudge green gradient),
 * "Mark Received as Cash" row + GPay / PhonePe / Paytm / CRED pills.
 * All actions are props wired by the caller to the real UPI / WhatsApp /
 * cash-settle flows. When `greedySummary` is null the pill hides;
 * when a CTA prop is missing that button hides (never a dead button).
 */
export function SettlementActionModule({
  greedySummary = null,
  greedyCount = 0,
  onRequestUpi,
  onWhatsappNudge,
  onMarkCash,
  testID = "settlement-action-module",
}) {
  const providers = ["GPay", "PhonePe", "Paytm", "CRED"];
  return (
    <View testID={testID} style={styles.card}>
      {greedySummary ? (
        <View style={styles.greedyPill}>
          <View style={styles.greedyLeft}>
            <View style={styles.sparkleWrap}>
              <AiSparkleIcon size={15} />
            </View>
            <Text style={styles.greedyText} numberOfLines={2}>
              {greedySummary}
            </Text>
          </View>
          <View style={styles.greedyBadge}>
            <Text style={styles.greedyBadgeText}>⚡ GREEDY AI</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.ctaRow}>
        {onRequestUpi ? (
          <TouchableOpacity
            onPress={onRequestUpi}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Request UPI payment"
            testID="settlement-request-upi"
            style={styles.ctaFlex}
          >
            <LinearGradient
              colors={kinetic.colors.coralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, kinetic.shadows.ctaCoral]}
            >
              <UpiLightningIcon size={18} />
              <Text style={styles.ctaText}>Request UPI</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
        {onWhatsappNudge ? (
          <TouchableOpacity
            onPress={onWhatsappNudge}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Nudge on WhatsApp"
            testID="settlement-whatsapp-nudge"
            style={styles.ctaFlex}
          >
            <LinearGradient
              colors={kinetic.colors.whatsappGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, kinetic.shadows.ctaWhatsapp]}
            >
              <WhatsAppNudgeIcon size={18} />
              <Text style={styles.ctaText}>WhatsApp Nudge</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.bottomRow}>
        {onMarkCash ? (
          <TouchableOpacity
            onPress={onMarkCash}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Mark received as cash"
            testID="settlement-mark-cash"
            style={styles.markCash}
          >
            <CashDoubleCheckIcon size={18} />
            <Text style={styles.markCashText}>Mark Received as Cash</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.providers}>
          <Text style={styles.providersLabel}>instant sync via</Text>
          <View style={styles.providerPills}>
            {providers.map((p, i) => (
              <React.Fragment key={p}>
                <View style={styles.providerPill}>
                  <Text style={styles.providerText}>{p}</Text>
                </View>
                {i < providers.length - 1 ? (
                  <Text style={styles.providerSep}>/</Text>
                ) : null}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
      {greedyCount > 0 ? (
        <Text style={styles.greedyCount} accessibilityHidden>
          {`Collapses ${greedyCount} dues into 1 transfer`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: kinetic.colors.card,
    borderWidth: 1,
    borderColor: kinetic.colors.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    ...kinetic.shadows.card,
  },
  greedyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: kinetic.colors.tintBlue,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: kinetic.radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  greedyLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  sparkleWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  greedyText: {
    ...kinetic.typography.caption,
    color: kinetic.colors.textPrimary,
    flex: 1,
  },
  greedyBadge: {
    backgroundColor: kinetic.colors.card,
    borderWidth: 1,
    borderColor: kinetic.colors.border,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  greedyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: kinetic.colors.navy,
  },
  ctaRow: { flexDirection: "row", gap: 10 },
  ctaFlex: { flex: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: kinetic.radii.full,
  },
  ctaText: {
    ...kinetic.typography.headingSmall,
    color: kinetic.colors.textInverse,
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: kinetic.colors.border,
    marginTop: 12,
    paddingTop: 12,
    gap: 8,
  },
  markCash: { flexDirection: "row", alignItems: "center", minHeight: 32 },
  markCashText: {
    ...kinetic.typography.bodyMedium,
    color: kinetic.colors.textPrimary,
    marginLeft: 6,
  },
  providers: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  providersLabel: {
    ...kinetic.typography.caption,
    color: kinetic.colors.textSecondary,
    marginRight: 6,
  },
  providerPills: { flexDirection: "row", alignItems: "center" },
  providerPill: {
    backgroundColor: kinetic.colors.subtle,
    borderWidth: 1,
    borderColor: kinetic.colors.border,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  providerText: { fontSize: 10, fontWeight: "700", color: kinetic.colors.textPrimary },
  providerSep: {
    fontSize: 10,
    color: kinetic.colors.textTertiary,
    marginHorizontal: 2,
  },
  greedyCount: { display: "none" },
});
