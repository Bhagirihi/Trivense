import { Platform, StyleSheet } from "react-native";
import { layout, radii, spacing, typography } from "../../theme/tokens";
import { shadowStyle } from "../../utils/platformStyles";

// Dashboard screen styles, extracted verbatim from DashboardScreen.js
// (1,108 lines -> split so the screen file holds logic, not layout).
// The block only uses static tokens, so it stays a plain StyleSheet.

const HOME_SECTION_GAP = spacing.xl;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  exploreText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
  },
  sections: {
    gap: HOME_SECTION_GAP,
    marginTop: spacing.sm,
  },
  transactionsBlock: {
    gap: spacing.sm,
  },
  firstBoardCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  firstBoardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  firstBoardTitle: {
    ...typography.h3,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  firstBoardSubtitle: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  firstBoardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    width: "100%",
    justifyContent: "center",
  },
  firstBoardButtonText: {
    ...typography.bodyMedium,
    fontWeight: "700",
  },
  firstBoardLink: {
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  firstBoardLinkText: {
    ...typography.caption,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  headerTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceCard: {
    padding: Platform.OS === "android" ? spacing.lg : spacing.xl,
    borderRadius: radii.xl,
    ...shadowStyle(6),
  },
  balanceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Platform.OS === "android" ? spacing.md : spacing.lg,
  },
  balanceEyebrow: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  balanceHero: {
    color: "#FFFFFF",
    fontSize: Platform.OS === "android" ? 26 : 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  balanceStatPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "flex-end",
  },
  balancePillLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "600",
  },
  balancePillValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  balanceStatsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: Platform.OS === "android" ? spacing.md : spacing.lg,
  },
  balanceMiniStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  balanceMiniLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "500",
  },
  balanceMiniValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  seeAllButton: {
    padding: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  notificationTestContainer: {
    marginBottom: spacing.sm,
  },
  notificationButtonsScroll: {
    marginTop: 10,
  },
  devNotificationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    ...shadowStyle(3),
  },
  notificationButtonText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "500",
  },
});
