import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { getFeatureLockInfo } from "../config/subscriptionPlans";

export const FeatureLockModal = ({
  visible,
  feature,
  onClose,
  onUpgrade,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const info = getFeatureLockInfo(feature);

  if (!info) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: `${theme.primary}15` }]}
          >
            <MaterialCommunityIcons
              name={info.icon || "lock-outline"}
              size={28}
              color={theme.primary}
            />
          </View>

          <View style={[styles.premiumBadge, { backgroundColor: `${theme.primary}15` }]}>
            <MaterialCommunityIcons name="crown" size={14} color={theme.primary} />
            <Text style={[styles.premiumBadgeText, { color: theme.primary }]}>
              {t("premiumFeature")}
            </Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {t(info.titleKey)}
          </Text>

          <Text style={[styles.desc, { color: theme.textSecondary }]}>
            {t(info.descKey)}
          </Text>

          <View
            style={[styles.benefitBox, { backgroundColor: `${theme.success}12` }]}
          >
            <MaterialCommunityIcons
              name="star-circle"
              size={18}
              color={theme.success}
            />
            <Text style={[styles.benefit, { color: theme.text }]}>
              {t(info.benefitKey)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.okayBtn, { backgroundColor: theme.primary }]}
            onPress={onUpgrade}
          >
            <Text style={styles.okayBtnText}>{t("okay")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
              {t("notNow")}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 14,
  },
  benefitBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: "100%",
  },
  benefit: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  okayBtn: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  okayBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default FeatureLockModal;
