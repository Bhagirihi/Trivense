import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { FEATURES } from "../config/subscriptionPlans";
import { useFeatureLockModal } from "../hooks/useFeatureLockModal";

const AddBoardModal = ({
  visible,
  onClose,
  onCreateNew,
  onJoinExisting,
  joinLocked = false,
  navigation,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { openFeatureLock, featureLockModal } = useFeatureLockModal(navigation);

  const handleJoinPress = () => {
    if (joinLocked) {
      onClose();
      setTimeout(() => openFeatureLock(FEATURES.BOARD_SHARING), 300);
      return;
    }
    onJoinExisting?.();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {t("add")}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.option, { backgroundColor: theme.background }]}
              onPress={onCreateNew}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>
                  {t("startNewBoard")}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {t("startNewBoardDesc")}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: theme.background },
                joinLocked && { opacity: 0.55 },
              ]}
              onPress={handleJoinPress}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: joinLocked
                      ? theme.borderLight
                      : theme.success + "20",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={joinLocked ? "lock-outline" : "link"}
                  size={24}
                  color={joinLocked ? theme.textSecondary : theme.success}
                />
              </View>
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: joinLocked ? theme.textSecondary : theme.text },
                  ]}
                >
                  {t("joinExistingBoard")}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {joinLocked ? t("premiumFeature") : t("joinExistingBoardDesc")}
                </Text>
              </View>
              {joinLocked ? (
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={theme.textSecondary}
                />
              ) : (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {featureLockModal}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default AddBoardModal;
