import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "../hooks/useTranslation";
import FeatureLockModal from "./FeatureLockModal";

export const PaywallGate = ({
  feature,
  children,
  navigation,
  compact = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { hasFeature } = useSubscription();
  const [modalVisible, setModalVisible] = useState(false);

  if (hasFeature(feature)) {
    return children;
  }

  const openPaywall = () => {
    setModalVisible(false);
    navigation.navigate("Paywall", { feature });
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={[styles.compact, { backgroundColor: `${theme.primary}10` }]}
          onPress={() => setModalVisible(true)}
        >
          <MaterialCommunityIcons name="lock-outline" size={18} color={theme.primary} />
          <Text style={[styles.compactText, { color: theme.primary }]}>
            {t("premiumFeature")}
          </Text>
        </TouchableOpacity>
        <FeatureLockModal
          visible={modalVisible}
          feature={feature}
          onClose={() => setModalVisible(false)}
          onUpgrade={openPaywall}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.blocked, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="lock-outline" size={32} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          {t("premiumFeature")}
        </Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {t("upgradePlanToUnlockTap")}
        </Text>
      </TouchableOpacity>
      <FeatureLockModal
        visible={modalVisible}
        feature={feature}
        onClose={() => setModalVisible(false)}
        onUpgrade={openPaywall}
      />
    </>
  );
};

const styles = StyleSheet.create({
  blocked: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  compactText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default PaywallGate;
