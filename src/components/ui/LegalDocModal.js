import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "../../hooks/useTranslation";
import { LEGAL_META } from "../../config/legalContent";
import { layout, spacing, typography } from "../../theme/tokens";

/**
 * Mobile legal viewer — main points inline, link to full document on web.
 */
export function LegalDocModal({
  visible,
  title,
  points = [],
  fullUrl,
  onClose,
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const openFullDocument = () => {
    if (!fullUrl) return;
    Linking.openURL(fullUrl).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + spacing.sm,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            testID="legal-doc-close"
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialCommunityIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator
        >
          <Text style={[styles.updated, { color: theme.textMuted }]}>
            Last updated: {LEGAL_META.lastUpdated}
          </Text>

          {points.map((point, index) => (
            <View key={index} style={styles.bulletRow}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color={theme.primary}
                style={styles.bulletIcon}
              />
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                {point}
              </Text>
            </View>
          ))}

          {fullUrl ? (
            <TouchableOpacity
              testID="legal-doc-full-link"
              style={[styles.fullLink, { borderColor: theme.border }]}
              onPress={openFullDocument}
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={18}
                color={theme.primary}
              />
              <Text style={[styles.fullLinkText, { color: theme.primary }]}>
                {t("readFullDocumentOnline")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...typography.h2,
    flex: 1,
    marginRight: spacing.md,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
  },
  updated: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  bulletIcon: {
    marginTop: 2,
    marginRight: spacing.sm,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
  },
  fullLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
  },
  fullLinkText: {
    ...typography.label,
  },
});

export default LegalDocModal;
