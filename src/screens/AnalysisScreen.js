import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Share,
  Alert,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { formatCurrency } from "../utils/formatters";
import { expenseBoardService } from "../services/expenseBoardService";
import { useTranslation } from "../hooks/useTranslation";
import { useSubscription } from "../context/SubscriptionContext";
import { FEATURES } from "../config/subscriptionPlans";
import { PaywallGate } from "../components/PaywallGate";
import PremiumFeatureAd from "../components/PremiumFeatureAd";
import { buildBoardJoinUrl } from "../config/appLinks";
import {
  buildWhoOwesMessage,
  isValidUpiId,
  openUpiPayment,
} from "../utils/upiSettle";
import { useAuth } from "../context/AuthContext";
import { kinetic } from "../theme/tokens";
import { SettlementActionModule } from "../components/kinetic/SettlementActionModule";

const K = kinetic.colors;
const KT = kinetic.typography;
const DONUT_COLORS = [
  K.coral,
  K.navy,
  K.upiBlue,
  "#8B5CF6",
  K.success,
  K.warning,
];

// Per-BOARD analysis: who paid, who owes whom, and settlements for ONE
// board (via expenseBoardService.getExpenseBoardsByID). Not a duplicate of
// AnalyticsScreen, which is GLOBAL trends across all boards/periods.
// Layout authority: Stitch analysisscreen export (Greedy hero, settlement
// cards, WhatsApp summary card). Palette: navy #003D66 / coral #F97316.
export const AnalysisScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { hasFeature } = useSubscription();
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const boardId = route.params?.boardId;
  const [loading, setLoading] = useState(true);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [trips, setTrips] = useState([]);
  const [analysisData, setAnalysisData] = useState({
    totalExpense: 0,
    totalBudget: 0,
    perPersonBudget: 0,
    participantCount: 0,
    participants: [],
    settlements: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalysisData = useCallback(async () => {
    if (!selectedTrip?.id) return;
    try {
      const data = await expenseBoardService.getExpenseBoardsByID(
        selectedTrip.id
      );

      const totalBudget = Number(data.totalBudget);
      const totalExpenses = Number(data.totalExpenses);
      const participantCount = data.participants?.length ?? 0;
      const perPersonBudget = Number(data.perPersonBudget);
      const participant = data.participants ?? [];
      const settlements = data.settlements ?? [];

      setAnalysisData({
        totalExpense: totalExpenses,
        totalBudget: totalBudget,
        perPersonBudget: Number(perPersonBudget.toFixed(2)),
        participants: participant,
        settlements: settlements,
        participantCount: participantCount,
      });
    } catch (error) {
      console.error("Error fetching analysis data:", error);
    }
  }, [selectedTrip]);

  const fetchBoardsDetails = useCallback(
    async (boardIdParam) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { data: boards, error } = await supabase
          .from("expense_boards")
          .select(
            `
          id,
          name,
          total_budget,
          created_at
        `
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formattedBoards = (boards || []).map((board) => ({
          id: board.id,
          name: board.name,
          date: new Date(board.created_at).toLocaleDateString(),
          total_budget: board.total_budget,
        }));
        setTrips(formattedBoards);
        if (formattedBoards.length > 0) {
          // As a tab there is no boardId param: default to the most
          // recent board instead of an empty state.
          const selected =
            formattedBoards.find((board) => board.id === boardIdParam) ||
            formattedBoards[0];
          setSelectedTrip(selected);
        }
      } catch (error) {
        console.error("Error fetching boards details:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBoardsDetails(boardId);
  }, [boardId, fetchBoardsDetails]);

  useEffect(() => {
    if (selectedTrip?.id) fetchAnalysisData();
  }, [selectedTrip?.id, fetchAnalysisData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBoardsDetails(boardId);
      if (selectedTrip?.id) await fetchAnalysisData();
    } finally {
      setRefreshing(false);
    }
  };

  const shareWhoOwes = async () => {
    try {
      const message = buildWhoOwesMessage({
        boardName: selectedTrip?.name,
        settlements: analysisData.settlements,
        joinUrl: boardId ? buildBoardJoinUrl(boardId) : undefined,
      });
      await Share.share({ message });
    } catch (error) {
      if (error?.message !== "User did not share") {
        Alert.alert(t("error"), t("failedToShareSettlements"));
      }
    }
  };

  const paySettlement = async (settlement) => {
    const note = `Trivense ${selectedTrip?.name || "settle"}`;
    if (isValidUpiId(settlement.toUpi)) {
      try {
        await openUpiPayment({
          pa: settlement.toUpi,
          pn: settlement.to,
          amount: settlement.amount,
          note,
        });
      } catch {
        Alert.alert(t("error"), t("couldNotOpenUpi"));
      }
      return;
    }
    Alert.alert(
      t("upiIdMissingTitle"),
      t("upiIdMissingBody").replace("{{name}}", settlement.to),
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("shareWhoOwes"), onPress: shareWhoOwes },
      ]
    );
  };

  // WhatsApp nudge for one debtor: wa.me when the debtor has a mobile
  // number on file, otherwise the system share sheet with the same text.
  const nudgeDebtor = async (settlement) => {
    const message =
      `Hi ${settlement.from}, you owe ${formatCurrency(settlement.amount)} ` +
      `to ${settlement.to} for ${selectedTrip?.name || "Trivense"}. ` +
      `Please settle it on Trivense.`;
    const debtor = analysisData.participants.find(
      (p) => p.id === settlement.fromId
    );
    const digits = String(debtor?.mobile || "").replace(/\D/g, "");
    const waNumber =
      digits.length === 10 ? `91${digits}` : digits.length >= 11 ? digits : "";
    if (waNumber) {
      const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        // fall through to the share sheet
      }
    }
    try {
      await Share.share({ message });
    } catch (error) {
      if (error?.message !== "User did not share") {
        Alert.alert(t("error"), t("failedToShareSettlements"));
      }
    }
  };

  const settlements = analysisData.settlements;
  const participants = analysisData.participants;
  const pendingTotal = settlements.reduce(
    (sum, s) => sum + Number(s.amount || 0),
    0
  );
  const membersToSettle = participants.filter(
    (p) => Number(p.balancePaise || 0) !== 0
  ).length;
  const myPayable = settlements.find((s) => s.fromId === currentUserId);
  const myReceivable = settlements.find((s) => s.toId === currentUserId);
  const overBudget = analysisData.totalExpense > analysisData.totalBudget;
  const topSpender =
    participants.length > 0
      ? [...participants].sort(
          (a, b) => Number(b.spent || 0) - Number(a.spent || 0)
        )[0]
      : null;

  const greedySummary =
    settlements.length > 0
      ? `Settles ${membersToSettle} member${membersToSettle === 1 ? "" : "s"} to ₹0 in ${settlements.length} transfer${settlements.length === 1 ? "" : "s"}.`
      : null;

  const initials = (name) =>
    String(name || "M")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

  const renderTripSelector = () => {
    if (!selectedTrip) return null;
    return (
      <TouchableOpacity
        style={styles.boardSwitcher}
        onPress={() => setShowTripSelector(true)}
        accessibilityRole="button"
        accessibilityLabel={t("selectTrip")}
        testID="analysis-board-switcher"
      >
        <Text style={styles.boardSwitcherName} numberOfLines={1}>
          {selectedTrip.name}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={K.navy}
        />
      </TouchableOpacity>
    );
  };

  const renderTripSelectorModal = () => (
    <Modal
      visible={showTripSelector}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTripSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("selectTrip")}</Text>
            <TouchableOpacity
              onPress={() => setShowTripSelector(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("cancel")}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={K.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {trips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={[
                  styles.tripItem,
                  selectedTrip.id === trip.id && styles.tripItemActive,
                ]}
                onPress={() => {
                  setSelectedTrip(trip);
                  setShowTripSelector(false);
                }}
              >
                <View>
                  <Text style={styles.tripItemName}>{trip.name}</Text>
                  <Text style={styles.tripItemDate}>{trip.date}</Text>
                </View>
                {selectedTrip.id === trip.id && (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color={K.navy}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderGreedyHero = () => (
    <LinearGradient
      colors={K.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroPill}>
        <MaterialCommunityIcons name="lightning-bolt" size={15} color="#7FFC97" />
        <Text style={styles.heroPillText}>
          Optimized by Trivense Greedy Engine
        </Text>
      </View>
      <View style={styles.heroTop}>
        <Text style={styles.heroAmount}>{formatCurrency(pendingTotal)}</Text>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>
            {settlements.length} Transfer{settlements.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
      <Text style={styles.heroSub}>
        {settlements.length > 0
          ? `Settles all ${analysisData.participantCount} member${analysisData.participantCount === 1 ? "" : "s"} to ₹0 zero-balance with minimal net transfers.`
          : t("allPaymentsSettled")}
      </Text>
      <View style={styles.heroFooter}>
        <Text style={styles.heroFooterText}>
          Total Trip: {formatCurrency(analysisData.totalExpense)}
        </Text>
        <Text style={[styles.heroFooterText, styles.heroFooterTarget]}>
          Target: Nil Dues
        </Text>
      </View>
    </LinearGradient>
  );

  const renderSummaryCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("tripSummary")}</Text>
      <View style={styles.summaryGrid}>
        {[
          {
            label: t("expense"),
            value: formatCurrency(
              Number(analysisData.totalExpense.toFixed(2))
            ),
            icon: "cash-multiple",
          },
          {
            label: t("budget"),
            value: formatCurrency(
              Number(analysisData.totalBudget.toFixed(2))
            ),
            icon: "wallet",
          },
          {
            label: t("perPerson"),
            value: formatCurrency(
              Number(analysisData.perPersonBudget.toFixed(2))
            ),
            icon: "account-group",
          },
          {
            label: t("status"),
            value: overBudget ? t("overBudget") : t("underBudget"),
            icon: overBudget ? "alert-circle" : "check-circle",
            valueColor: overBudget ? K.textNegative : K.textPositive,
          },
        ].map((item) => (
          <View key={item.label} style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={K.navy}
              />
            </View>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text
              style={[
                styles.summaryValue,
                item.valueColor ? { color: item.valueColor } : null,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSpendingDonut = () => {
    if (participants.length === 0 || analysisData.totalExpense <= 0) {
      return null;
    }
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = participants.map((p, index) => {
      const pct = Number(p.percentage || 0) / 100;
      const seg = {
        key: p.id,
        dash: pct * circumference,
        offset,
        color: DONUT_COLORS[index % DONUT_COLORS.length],
      };
      offset -= pct * circumference;
      return seg;
    });
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>
            {analysisData.participantCount > 0
              ? t("perPersonSpendingCount").replace(
                  "{{count}}",
                  String(analysisData.participantCount)
                )
              : t("noParticipants")}
          </Text>
        </View>
        <View style={styles.donutWrap}>
          <Svg width={176} height={176} viewBox="0 0 100 100">
            <Circle
              cx="50"
              cy="50"
              r={radius}
              stroke={K.subtle}
              strokeWidth={12}
              fill="none"
            />
            {segments.map((seg) => (
              <Circle
                key={seg.key}
                cx="50"
                cy="50"
                r={radius}
                stroke={seg.color}
                strokeWidth={12}
                fill="none"
                strokeDasharray={`${Math.max(seg.dash, 0)} ${circumference}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            ))}
          </Svg>
          <View style={styles.donutCenter}>
            <Text style={styles.donutCenterLabel}>Top Spent</Text>
            <Text style={styles.donutCenterValue}>
              {topSpender ? `${Number(topSpender.percentage || 0).toFixed(0)}%` : "—"}
            </Text>
            <Text style={styles.donutCenterName} numberOfLines={1}>
              {topSpender ? topSpender.name : ""}
            </Text>
          </View>
        </View>
        {participants.map((participant, index) => (
          <View key={participant.id} style={styles.participantItem}>
            <View
              style={[
                styles.participantAvatar,
                {
                  backgroundColor:
                    DONUT_COLORS[index % DONUT_COLORS.length] + "1A",
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitials,
                  { color: DONUT_COLORS[index % DONUT_COLORS.length] },
                ]}
              >
                {initials(participant.name)}
              </Text>
            </View>
            <View style={styles.participantDetails}>
              <View style={styles.participantTop}>
                <Text style={styles.participantName} numberOfLines={1}>
                  {participant.name}
                </Text>
                <Text style={styles.participantAmount}>
                  {formatCurrency(participant.spent)}
                </Text>
              </View>
              <View style={styles.percentageBar}>
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${Math.min(Number(participant.percentage || 0), 100)}%`,
                      backgroundColor:
                        DONUT_COLORS[index % DONUT_COLORS.length],
                    },
                  ]}
                />
              </View>
              <Text style={styles.participantPercentage}>
                {t("percentOfTotal").replace(
                  "{{percent}}",
                  String(participant.percentage)
                )}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderInsights = () => {
    const items = [];
    items.push({
      icon: overBudget ? "alert-circle-outline" : "check-circle-outline",
      color: overBudget ? K.textNegative : K.textPositive,
      bg: overBudget ? "#FEF2F2" : K.tintGreen,
      title: overBudget ? t("overBudget") : t("underBudget"),
      desc:
        `Spent ${formatCurrency(analysisData.totalExpense)} of ` +
        `${formatCurrency(analysisData.totalBudget)} budget — ` +
        `${formatCurrency(Math.abs(analysisData.totalBudget - analysisData.totalExpense))} ` +
        `${overBudget ? "over" : "left"}.`,
    });
    if (topSpender) {
      items.push({
        icon: "account-star",
        color: K.navy,
        bg: K.tintBlue,
        title: "Top spender",
        desc:
          `${topSpender.name} paid ${formatCurrency(topSpender.spent)} — ` +
          `${Number(topSpender.percentage || 0).toFixed(0)}% of the board total.`,
      });
    }
    items.push({
      icon: "swap-horizontal",
      color: K.coralDark,
      bg: K.tintAmber,
      title: "Pending settlements",
      desc:
        settlements.length > 0
          ? `${settlements.length} transfer${settlements.length === 1 ? "" : "s"} totalling ${formatCurrency(pendingTotal)} still open.`
          : "Nothing pending — everyone is settled.",
    });
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insights</Text>
        {items.map((item) => (
          <View key={item.title} style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: item.bg }]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={item.color}
              />
            </View>
            <View style={styles.insightBody}>
              <Text style={styles.insightTitle}>{item.title}</Text>
              <Text style={styles.insightDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSettlements = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>Active Settlements</Text>
          {settlements.length > 0 ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>
                {settlements.length} Pending
              </Text>
            </View>
          ) : null}
        </View>
        {settlements.length > 0 ? (
          <TouchableOpacity
            onPress={shareWhoOwes}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("shareWhoOwes")}
          >
            <MaterialCommunityIcons name="whatsapp" size={24} color={K.navy} />
          </TouchableOpacity>
        ) : null}
      </View>
      {settlements.map((settlement, index) => {
        const isDebtor =
          currentUserId && settlement.fromId === currentUserId;
        const isCreditor =
          currentUserId && settlement.toId === currentUserId;
        const involved = isDebtor || isCreditor;
        return (
          <View
            key={`${settlement.fromId}-${settlement.toId}-${index}`}
            style={styles.settlementCard}
          >
            <View
              style={[
                styles.settlementEdge,
                { backgroundColor: involved ? K.coral : K.borderStrong },
              ]}
            />
            <View style={styles.settlementTop}>
              <View style={styles.boardChip}>
                <MaterialCommunityIcons
                  name="folder"
                  size={13}
                  color={K.textSecondary}
                />
                <Text style={styles.boardChipText} numberOfLines={1}>
                  {selectedTrip?.name}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  isDebtor ? styles.statusPillPending : styles.statusPillWaiting,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isDebtor ? styles.statusPillTextPending : null,
                  ]}
                >
                  {isDebtor ? "Pending UPI" : "Awaiting Settlement"}
                </Text>
              </View>
            </View>
            <View style={styles.settlementMain}>
              <View style={styles.settlementFlow}>
                <View style={styles.settlementPerson}>
                  <View
                    style={[
                      styles.settlementAvatar,
                      { backgroundColor: K.navy },
                    ]}
                  >
                    <Text style={styles.settlementAvatarText}>
                      {initials(settlement.from)}
                    </Text>
                  </View>
                  <Text style={styles.settlementPersonName} numberOfLines={1}>
                    {settlement.from}
                  </Text>
                  <Text style={styles.settlementPersonRole}>Debtor</Text>
                </View>
                <View style={styles.settlementArrowWrap}>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color={involved ? K.coral : K.textTertiary}
                  />
                  <Text style={styles.settlementArrowLabel}>pays</Text>
                </View>
                <View style={styles.settlementPerson}>
                  <View
                    style={[
                      styles.settlementAvatar,
                      { backgroundColor: K.coral },
                    ]}
                  >
                    <Text style={styles.settlementAvatarText}>
                      {initials(settlement.to)}
                    </Text>
                  </View>
                  <Text style={styles.settlementPersonName} numberOfLines={1}>
                    {settlement.to}
                  </Text>
                  <Text style={styles.settlementPersonRole}>Creditor</Text>
                </View>
              </View>
              <View style={styles.settlementAmountWrap}>
                <Text style={styles.settlementAmountLabel}>Amount</Text>
                <Text
                  style={[
                    styles.settlementAmount,
                    { color: involved ? K.coralDark : K.textPrimary },
                  ]}
                >
                  {formatCurrency(settlement.amount)}
                </Text>
                <Text style={styles.settlementAmountSub}>
                  {settlement.from} owes {settlement.to}
                </Text>
              </View>
            </View>
            <View style={styles.greedyNote}>
              <MaterialCommunityIcons
                name="auto-fix"
                size={16}
                color={K.navy}
              />
              <Text style={styles.greedyNoteText}>
                Net transfer · Greedy engine
              </Text>
            </View>
            {isDebtor ? (
              <TouchableOpacity
                style={styles.payUpiBtn}
                onPress={() => paySettlement(settlement)}
                accessibilityRole="button"
                accessibilityLabel={t("payViaUpi")}
                testID={`analysis-pay-upi-${index}`}
              >
                <LinearGradient
                  colors={K.coralGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.payUpiGradient}
                >
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.payUpiBtnText}>{t("payViaUpi")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : isCreditor ? (
              <TouchableOpacity
                style={styles.nudgeBtn}
                onPress={() => nudgeDebtor(settlement)}
                accessibilityRole="button"
                accessibilityLabel="Nudge on WhatsApp"
                testID={`analysis-nudge-${index}`}
              >
                <LinearGradient
                  colors={K.whatsappGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.payUpiGradient}
                >
                  <MaterialCommunityIcons
                    name="whatsapp"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.payUpiBtnText}>WhatsApp Nudge</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.reminderBtn}
                onPress={shareWhoOwes}
                accessibilityRole="button"
                accessibilityLabel="Send group reminder"
              >
                <MaterialCommunityIcons
                  name="bell-ring-outline"
                  size={16}
                  color={K.navy}
                />
                <Text style={styles.reminderBtnText}>
                  Send Group Reminder
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      {settlements.length === 0 && (
        <View style={styles.emptySettlements}>
          <MaterialCommunityIcons
            name="check-circle"
            size={40}
            color={K.success}
            style={styles.emptySettlementsIcon}
          />
          <Text style={styles.emptySettlementsText}>
            {t("allPaymentsSettled")}
          </Text>
        </View>
      )}
    </View>
  );

  const renderWhatsAppCard = () => {
    if (settlements.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Group WhatsApp Card</Text>
          <Text style={styles.sectionHint}>Ready to copy</Text>
        </View>
        <LinearGradient
          colors={["#001D34", "#003457"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.summaryPreview}
        >
          <View style={styles.summaryPreviewHeader}>
            <View style={styles.summaryBrand}>
              <View style={styles.summaryBrandMark}>
                <Text style={styles.summaryBrandMarkText}>T</Text>
              </View>
              <Text style={styles.summaryBrandText}>TRIVENSE SUMMARY</Text>
            </View>
            <View style={styles.summaryBoardPill}>
              <Text style={styles.summaryBoardPillText} numberOfLines={1}>
                {selectedTrip?.name}
              </Text>
            </View>
          </View>
          <View style={styles.summaryTotalRow}>
            <View>
              <Text style={styles.summaryTotalLabel}>Total Group Spend</Text>
              <Text style={styles.summaryTotalValue}>
                {formatCurrency(analysisData.totalExpense)}
              </Text>
            </View>
            <View style={styles.summaryTotalRight}>
              <Text style={styles.summaryMembers}>
                {analysisData.participantCount} Members
              </Text>
              <Text style={styles.summaryMembersSub}>All logged</Text>
            </View>
          </View>
          {settlements.map((s, index) => (
            <View
              key={`${s.fromId}-${s.toId}-${index}`}
              style={styles.summaryMatrixRow}
            >
              <Text style={styles.summaryMatrixText} numberOfLines={1}>
                {s.from} pays {s.to}
              </Text>
              <Text style={styles.summaryMatrixAmount}>
                {formatCurrency(s.amount)}
              </Text>
            </View>
          ))}
          <View style={styles.summaryPreviewFooter}>
            <Text style={styles.summaryPreviewFooterText}>
              Everyone settles to ₹0 with these transfers
            </Text>
            {boardId ? (
              <Text style={styles.summaryPreviewFooterLink}>trivense.app</Text>
            ) : null}
          </View>
        </LinearGradient>
        <TouchableOpacity
          style={styles.shareWhatsappBtn}
          onPress={shareWhoOwes}
          accessibilityRole="button"
          accessibilityLabel={t("shareWhoOwes")}
          testID="analysis-share-whatsapp-summary"
        >
          <LinearGradient
            colors={K.whatsappGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareWhatsappGradient}
          >
            <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
            <Text style={styles.shareWhatsappBtnText}>
              Share Summary on WhatsApp Group
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const analysisHeader = (
    <Header title={t("settlements")} onBack={() => navigation.goBack()} />
  );

  if (!hasFeature(FEATURES.BOARD_SETTLEMENTS)) {
    return (
      <ScreenLayout header={analysisHeader} footerRoute={null}>
        <View style={[styles.loadingContainer, { padding: 24 }]}>
          <PaywallGate
            feature={FEATURES.BOARD_SETTLEMENTS}
            navigation={navigation}
          />
        </View>
      </ScreenLayout>
    );
  }

  if (loading) {
    return (
      <ScreenLayout header={analysisHeader} footerRoute={null}>
        <AnimatedLoader context="settlements" />
      </ScreenLayout>
    );
  }

  if (!selectedTrip) {
    return (
      <ScreenLayout header={analysisHeader} footerRoute={null}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t("noBoardsToSettle")}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      header={analysisHeader}
      footerRoute={null}
      contentStyle={{ backgroundColor: K.canvas }}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <PremiumFeatureAd style={{ marginBottom: 12 }} />
        {renderTripSelector()}
        {renderGreedyHero()}
        {settlements.length > 0 ? (
          <View style={styles.moduleWrap}>
            <SettlementActionModule
              greedySummary={greedySummary}
              greedyCount={0}
              onRequestUpi={
                myPayable ? () => paySettlement(myPayable) : undefined
              }
              onWhatsappNudge={
                myReceivable
                  ? () => nudgeDebtor(myReceivable)
                  : () => shareWhoOwes()
              }
            />
          </View>
        ) : null}
        {renderSummaryCard()}
        {renderSpendingDonut()}
        {renderInsights()}
        {renderSettlements()}
        {renderWhatsAppCard()}
      </ScrollView>
      {renderTripSelectorModal()}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...KT.bodyMedium,
    fontSize: 16,
  },
  boardSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 16,
    minHeight: 44,
    marginBottom: 12,
    ...kinetic.shadows.card,
  },
  boardSwitcherName: {
    ...KT.headingSmall,
    color: K.textPrimary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: K.card,
    borderTopLeftRadius: kinetic.radii.xl,
    borderTopRightRadius: kinetic.radii.xl,
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
    ...KT.headingLarge,
    color: K.textPrimary,
  },
  modalList: {
    maxHeight: "80%",
  },
  tripItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: kinetic.radii.md,
    marginBottom: 8,
    minHeight: 56,
  },
  tripItemActive: {
    backgroundColor: K.tintBlue,
  },
  tripItemName: {
    ...KT.bodyMedium,
    fontSize: 16,
    color: K.textPrimary,
    marginBottom: 4,
  },
  tripItemDate: {
    ...KT.body,
    color: K.textSecondary,
  },
  heroCard: {
    borderRadius: kinetic.radii.xl,
    padding: 20,
    marginBottom: 16,
    ...kinetic.shadows.elevated,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    gap: 6,
  },
  heroPillText: {
    ...KT.captionBold,
    fontSize: 11,
    color: "#7FFC97",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  heroAmount: {
    ...KT.displayLarge,
    color: K.textInverse,
  },
  heroChip: {
    backgroundColor: K.coral,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: {
    ...KT.captionBold,
    color: K.textInverse,
  },
  heroSub: {
    ...KT.body,
    color: "rgba(255,255,255,0.78)",
    marginBottom: 16,
  },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: 12,
    gap: 8,
  },
  heroFooterText: {
    ...KT.caption,
    color: "rgba(255,255,255,0.78)",
  },
  heroFooterTarget: {
    color: K.textInverse,
    fontFamily: kinetic.fonts.interBold,
  },
  moduleWrap: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    marginBottom: 16,
    ...kinetic.shadows.card,
  },
  cardHeaderRow: {
    marginBottom: 12,
  },
  cardTitle: {
    ...KT.headingMedium,
    color: K.textPrimary,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  summaryItem: {
    width: "48%",
    backgroundColor: K.subtle,
    borderRadius: kinetic.radii.md,
    padding: 12,
    marginBottom: 8,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: K.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    ...KT.caption,
    color: K.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    ...KT.headingSmall,
    fontSize: 16,
    color: K.textPrimary,
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    width: 110,
  },
  donutCenterLabel: {
    ...KT.captionBold,
    color: K.textSecondary,
    textTransform: "uppercase",
  },
  donutCenterValue: {
    ...KT.headingLarge,
    color: K.textPrimary,
  },
  donutCenterName: {
    ...KT.caption,
    color: K.coralDark,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: K.border,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarInitials: {
    ...KT.headingSmall,
    fontSize: 13,
  },
  participantDetails: {
    flex: 1,
  },
  participantTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  participantName: {
    ...KT.bodyMedium,
    fontSize: 15,
    color: K.textPrimary,
    flex: 1,
  },
  participantAmount: {
    ...KT.headingSmall,
    color: K.textPrimary,
  },
  percentageBar: {
    height: 6,
    backgroundColor: K.subtle,
    borderRadius: 3,
    marginBottom: 4,
    overflow: "hidden",
  },
  percentageFill: {
    height: "100%",
    borderRadius: 3,
  },
  participantPercentage: {
    ...KT.caption,
    color: K.textSecondary,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    ...KT.headingMedium,
    color: K.textPrimary,
  },
  sectionHint: {
    ...KT.caption,
    color: K.textSecondary,
  },
  pendingBadge: {
    backgroundColor: "#FFEDD5",
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    ...KT.captionBold,
    color: K.coralDark,
    textTransform: "uppercase",
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    ...kinetic.shadows.card,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    ...KT.headingSmall,
    color: K.textPrimary,
    marginBottom: 2,
  },
  insightDesc: {
    ...KT.body,
    color: K.textSecondary,
  },
  settlementCard: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    ...kinetic.shadows.card,
  },
  settlementEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 6,
  },
  settlementTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  boardChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.subtle,
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    maxWidth: "60%",
  },
  boardChipText: {
    ...KT.caption,
    color: K.textSecondary,
  },
  statusPill: {
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillPending: {
    backgroundColor: "#FFEDD5",
  },
  statusPillWaiting: {
    backgroundColor: K.subtle,
  },
  statusPillText: {
    ...KT.captionBold,
    color: K.textSecondary,
  },
  statusPillTextPending: {
    color: K.coralDark,
  },
  settlementMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  settlementFlow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settlementPerson: {
    alignItems: "center",
    width: 64,
  },
  settlementAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  settlementAvatarText: {
    ...KT.headingSmall,
    color: K.textInverse,
  },
  settlementPersonName: {
    ...KT.caption,
    color: K.textPrimary,
    textAlign: "center",
  },
  settlementPersonRole: {
    fontSize: 10,
    fontWeight: "700",
    color: K.textTertiary,
    textTransform: "uppercase",
  },
  settlementArrowWrap: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  settlementArrowLabel: {
    fontSize: 10,
    color: K.textTertiary,
  },
  settlementAmountWrap: {
    alignItems: "flex-end",
  },
  settlementAmountLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: K.textTertiary,
    textTransform: "uppercase",
  },
  settlementAmount: {
    ...KT.displayMedium,
    fontSize: 22,
  },
  settlementAmountSub: {
    ...KT.caption,
    color: K.textSecondary,
    textAlign: "right",
  },
  greedyNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: K.subtle,
    borderRadius: kinetic.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 6,
  },
  greedyNoteText: {
    ...KT.caption,
    color: K.textSecondary,
  },
  payUpiBtn: {
    marginTop: 12,
    borderRadius: kinetic.radii.full,
    overflow: "hidden",
    ...kinetic.shadows.ctaCoral,
  },
  nudgeBtn: {
    marginTop: 12,
    borderRadius: kinetic.radii.full,
    overflow: "hidden",
    ...kinetic.shadows.ctaWhatsapp,
  },
  payUpiGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: kinetic.radii.full,
    gap: 8,
  },
  payUpiBtnText: {
    ...KT.headingSmall,
    color: K.textInverse,
  },
  reminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: kinetic.radii.full,
    backgroundColor: K.subtle,
    marginTop: 12,
    gap: 6,
  },
  reminderBtnText: {
    ...KT.headingSmall,
    color: K.navy,
  },
  emptySettlements: {
    alignItems: "center",
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    borderRadius: kinetic.radii.lg,
    paddingVertical: 32,
    ...kinetic.shadows.card,
  },
  emptySettlementsIcon: {
    marginBottom: 12,
  },
  emptySettlementsText: {
    ...KT.bodyMedium,
    fontSize: 16,
    color: K.textSecondary,
  },
  summaryPreview: {
    borderRadius: kinetic.radii.lg,
    padding: 20,
    marginBottom: 12,
  },
  summaryPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    paddingBottom: 12,
    marginBottom: 12,
    gap: 8,
  },
  summaryBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryBrandMark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: K.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBrandMarkText: {
    ...KT.headingSmall,
    fontSize: 13,
    color: K.textInverse,
  },
  summaryBrandText: {
    ...KT.headingSmall,
    color: K.textInverse,
  },
  summaryBoardPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: kinetic.radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "45%",
  },
  summaryBoardPillText: {
    ...KT.caption,
    color: K.textInverse,
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: kinetic.radii.md,
    padding: 12,
    marginBottom: 12,
  },
  summaryTotalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
  },
  summaryTotalValue: {
    ...KT.displayMedium,
    color: K.textInverse,
  },
  summaryTotalRight: {
    alignItems: "flex-end",
  },
  summaryMembers: {
    ...KT.caption,
    color: "#7FFC97",
  },
  summaryMembersSub: {
    ...KT.caption,
    color: "rgba(255,255,255,0.7)",
  },
  summaryMatrixRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: kinetic.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  summaryMatrixText: {
    ...KT.bodyMedium,
    color: K.textInverse,
    flex: 1,
  },
  summaryMatrixAmount: {
    ...KT.headingSmall,
    color: K.coralLight,
  },
  summaryPreviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: 10,
    gap: 8,
  },
  summaryPreviewFooterText: {
    ...KT.caption,
    color: "#7FFC97",
    flex: 1,
  },
  summaryPreviewFooterLink: {
    ...KT.caption,
    color: "rgba(255,255,255,0.6)",
  },
  shareWhatsappBtn: {
    borderRadius: kinetic.radii.full,
    overflow: "hidden",
    ...kinetic.shadows.ctaWhatsapp,
  },
  shareWhatsappGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: kinetic.radii.full,
    gap: 8,
  },
  shareWhatsappBtnText: {
    ...KT.headingSmall,
    color: K.textInverse,
  },
});
