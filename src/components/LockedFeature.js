import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useTranslation } from "../hooks/useTranslation";
import { getFeatureLockInfo } from "../config/subscriptionPlans";
import FeatureLockModal from "./FeatureLockModal";

export const useFeatureLock = (feature) => {
  const { hasFeature } = useSubscription();
  return {
    locked: !hasFeature(feature),
    hasFeature: hasFeature(feature),
  };
};

export const LockedFeature = ({
  feature,
  navigation,
  children,
  compact = false,
  style,
}) => {
  const { locked } = useFeatureLock(feature);
  const [modalVisible, setModalVisible] = useState(false);

  if (!locked) {
    return children;
  }

  const openPaywall = () => {
    setModalVisible(false);
    navigation?.navigate("Paywall", { feature });
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={[style, styles.compact, { opacity: 0.45 }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.75}
        >
          {children}
          <View style={styles.compactBadge}>
            <MaterialCommunityIcons name="lock-outline" size={10} color="#888" />
          </View>
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
        style={[style, styles.wrap, { opacity: 0.55 }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <View pointerEvents="none">{children}</View>
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

export const LockedActionButton = ({
  feature,
  navigation,
  style,
  icon,
  label,
  onPress,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { locked } = useFeatureLock(feature);
  const [modalVisible, setModalVisible] = useState(false);

  const openPaywall = () => {
    setModalVisible(false);
    navigation.navigate("Paywall", { feature });
  };

  const handlePress = () => {
    if (locked) {
      setModalVisible(true);
      return;
    }
    onPress?.();
  };

  return (
    <>
      <TouchableOpacity
        style={[
          style,
          locked && styles.actionLocked,
          locked && { opacity: 0.55 },
        ]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons
          name={locked ? "lock-outline" : icon}
          size={24}
          color={locked ? theme.textSecondary : theme.primary}
        />
        <Text
          style={[
            styles.actionLabel,
            !locked && styles.actionLabelInline,
            { color: locked ? theme.textSecondary : theme.text },
          ]}
        >
          {label}
        </Text>
        {locked ? (
          <Text style={[styles.actionHint, { color: theme.primary }]}>
            {t("premiumFeature")}
          </Text>
        ) : null}
      </TouchableOpacity>
      {locked ? (
        <FeatureLockModal
          visible={modalVisible}
          feature={feature}
          onClose={() => setModalVisible(false)}
          onUpgrade={openPaywall}
        />
      ) : null}
    </>
  );
};

export const LockedIconButton = ({
  feature,
  navigation,
  style,
  icon,
  size = 24,
  onPress,
}) => {
  const { theme } = useTheme();
  const { locked } = useFeatureLock(feature);
  const [modalVisible, setModalVisible] = useState(false);

  const openPaywall = () => {
    setModalVisible(false);
    navigation.navigate("Paywall", { feature });
  };

  const handlePress = (event) => {
    if (locked) {
      event?.stopPropagation?.();
      setModalVisible(true);
      return;
    }
    onPress?.(event);
  };

  return (
    <>
      <TouchableOpacity
        style={[style, locked && { opacity: 0.45 }]}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons
          name={locked ? "lock-outline" : icon}
          size={size}
          color={locked ? theme.textSecondary : theme.primary}
        />
      </TouchableOpacity>
      {locked ? (
        <FeatureLockModal
          visible={modalVisible}
          feature={feature}
          onClose={() => setModalVisible(false)}
          onUpgrade={openPaywall}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
  },
  compact: {
    position: "relative",
  },
  compactBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLocked: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  actionLabelInline: {
    marginLeft: 8,
    marginTop: 0,
  },
  actionHint: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
});

export default LockedFeature;
