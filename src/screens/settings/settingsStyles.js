import { StyleSheet } from "react-native";
import { typography, spacing, radii } from "../../theme/tokens";

// Settings screen styles, extracted verbatim from SettingsScreen.js
// (2,216 lines -> split so the screen file holds logic, not layout).
// Note: a few entries keep function-valued colours, e.g.
// borderColor: (theme) => theme.borderLight. Those were already in the
// original StyleSheet; React Native ignores function values there, so
// this extraction deliberately does not change them — fixing them is a
// separate visual bug, not a refactor.

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  rewardedWrap: {
    marginBottom: 16,
  },
  accessStatusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 16,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accessStatusText: {
    ...typography.caption,
    flex: 1,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.micro,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionContent: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTexts: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  settingBenefit: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 16,
  },
  settingTapHint: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {},
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectorContent: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  selectorItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  selectorItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  budgetInputContainer: {
    marginBottom: 20,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  budgetInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
    fontSize: 16,
  },
  boardSelector: {
    marginBottom: 20,
  },
  boardSelectorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  boardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  boardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  sharedCount: {
    fontSize: 14,
  },
  premiumFeatures: {
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
  },
  pricingSection: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 24,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: "700",
  },
  pricePeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  upgradePremiumButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  upgradePremiumText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  boardDetailItem: {
    // marginBottom: 20,
    padding: 10,
    borderRadius: 12,
    backgroundColor: (theme) => `${theme.text}08`,
  },
  boardDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  boardDetailName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 12,
  },
  memberCount: {
    fontSize: 14,
  },
  memberList: {
    marginLeft: 48,
  },
  memberEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  shareContent: {
    padding: 8,
  },
  appInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  appIcon: {
    marginRight: 12,
  },
  appText: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "600",
  },
  appTagline: {
    fontSize: 14,
    marginTop: 2,
  },
  codeContainer: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 16,
    fontFamily: "monospace",
  },
  shareOptions: {
    gap: 12,
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  referralRewardBanner: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  referralInviteesSection: {
    marginTop: 20,
  },
  referralEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  referralInviteeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  referralInviteeText: {
    flex: 1,
  },
  referralInviteeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  referralInviteeEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  referralInviteeDate: {
    fontSize: 12,
    marginTop: 4,
  },
  dropdownContainer: {
    marginBottom: 20,
    position: "relative",
    zIndex: 1,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
    maxHeight: 200,
    overflow: "scroll",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: (theme) => theme.borderLight,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  boardListContainer: {
    marginBottom: 20,
  },
  boardItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: (theme) => theme.borderLight,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    padding: 8,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  successText: {
    color: "green",
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
});
