import { Platform, StyleSheet } from "react-native";
import { kinetic, layout, radii, spacing, typography } from "../../theme/tokens";
import { shadowStyle } from "../../utils/platformStyles";

// Dashboard screen styles — Kinetic Financial Neo-System (2026-11-13).
// Navy #003D66 / coral #F97316 palette only; never #0F2B46 / #FF6B2C.

const HOME_SECTION_GAP = spacing.xl;
const K = kinetic.colors;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
  },
  sections: {
    gap: HOME_SECTION_GAP,
    marginTop: spacing.sm,
  },
  // Greeting row ("Good morning, Dhruv" + streak pill).
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  greetingText: {
    ...kinetic.typography.displayMedium,
    color: K.textPrimary,
    flex: 1,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.tintAmber,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: kinetic.radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 32,
    gap: 4,
  },
  streakText: {
    ...kinetic.typography.captionBold,
    color: K.warning,
  },
  // Header avatar (real user profile initial).
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...kinetic.typography.headingMedium,
    color: K.textInverse,
  },
  headerTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    zIndex: 1,
  },
  notificationCount: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  // Monthly budget gauge card.
  gaugeCard: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: spacing.lg,
    ...kinetic.shadows.card,
  },
  gaugeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  gaugeTitle: {
    ...kinetic.typography.headingMedium,
    color: K.textPrimary,
  },
  gaugeSafeText: {
    ...kinetic.typography.captionBold,
    color: K.textPositive,
  },
  gaugeOverText: {
    ...kinetic.typography.captionBold,
    color: K.textNegative,
  },
  gaugeTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: K.subtle,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 4,
  },
  gaugeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  gaugeMetaText: {
    ...kinetic.typography.caption,
    color: K.textSecondary,
  },
  gaugeMetaValue: {
    ...kinetic.typography.caption,
    color: K.textPrimary,
    fontWeight: "700",
  },
  // Section headers ("Active Shared Boards", etc.).
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...kinetic.typography.headingMedium,
    color: K.textPrimary,
  },
  seeAllButton: {
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  seeAllText: {
    ...kinetic.typography.bodyMedium,
    color: K.navy,
  },
  boardsList: {
    gap: spacing.md,
  },
  transactionsBlock: {
    gap: spacing.sm,
  },
  // First-board / monthly-budget prompts (kept from before, kinetic restyle).
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
    minHeight: 48,
  },
  firstBoardButtonText: {
    ...typography.bodyMedium,
    fontWeight: "700",
  },
  firstBoardLink: {
    marginTop: spacing.md,
    padding: spacing.xs,
    minHeight: 44,
    justifyContent: "center",
  },
  firstBoardLinkText: {
    ...typography.caption,
    fontWeight: "600",
  },
  // Quick actions: existing 3-tile row (AppCue tour indices 0/1/2).
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  // Design quick actions row 2: New Board / Scan Bill / Nudge.
  designActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  designAction: {
    flex: 1,
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 76,
    ...kinetic.shadows.card,
  },
  designActionIcon: {
    width: 44,
    height: 44,
    borderRadius: kinetic.radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  designActionLabel: {
    ...kinetic.typography.caption,
    color: K.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
  aiBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: K.navy,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: K.textInverse,
    letterSpacing: 0.5,
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
  // Kept for Android/iOS parity in the old balance card (unused by the
  // kinetic hero, retained so nothing else referencing them breaks).
  balanceCard: {
    padding: Platform.OS === "android" ? spacing.lg : spacing.xl,
    borderRadius: radii.xl,
    ...shadowStyle(6),
  },
});
