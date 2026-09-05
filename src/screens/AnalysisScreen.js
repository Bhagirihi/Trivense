import React, { useState, useEffect } from "react";
import { shadowStyle } from "../utils/platformStyles";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  RefreshControl,
  Share,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../components/common/Card";
import StatCard from "../components/common/StatCard";
import { supabase } from "../config/supabase";
import { formatCurrency } from "../utils/formatters";
import { expenseBoardService } from "../services/expenseBoardService";
import { useTranslation } from "../hooks/useTranslation";
import { useSubscription } from "../context/SubscriptionContext";
import { FEATURES } from "../config/subscriptionPlans";
import PaywallGate from "../components/PaywallGate";
import PremiumFeatureAd from "../components/PremiumFeatureAd";
import { buildBoardJoinUrl } from "../config/appLinks";
import {
  buildWhoOwesMessage,
  isValidUpiId,
  openUpiPayment,
} from "../utils/upiSettle";
import { useAuth } from "../context/AuthContext";
const { width } = Dimensions.get("window");

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
  const [missingBoardId, setMissingBoardId] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (boardId) {
      setMissingBoardId(false);
      fetchBoardsDetails(boardId);
    } else {
      setMissingBoardId(true);
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (selectedTrip?.id) fetchAnalysisData();
  }, [selectedTrip?.id]);

  const fetchBoardsDetails = async (boardId) => {
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

      const formattedBoards = boards.map((board) => ({
        id: board.id,
        name: board.name,
        date: new Date(board.created_at).toLocaleDateString(),
        total_budget: board.total_budget,
      }));
      setTrips(formattedBoards);
      if (formattedBoards.length > 0) {
        const selected = formattedBoards.find((board) => board.id === boardId) || formattedBoards[0];
        setSelectedTrip(selected);
      }
    } catch (error) {
      console.error("Error fetching boards details:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!boardId) return;
    setRefreshing(true);
    try {
      await fetchBoardsDetails(boardId);
      if (selectedTrip?.id) await fetchAnalysisData();
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAnalysisData = async () => {
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
    Alert.alert(t("upiIdMissingTitle"), t("upiIdMissingBody").replace("{{name}}", settlement.to), [
      { text: t("cancel"), style: "cancel" },
      { text: t("shareWhoOwes"), onPress: shareWhoOwes },
    ]);
  };

  const renderTripSelector = () => {
    if (!selectedTrip) return null;
    return (
    <TouchableOpacity
      style={[styles.tripSelector, { backgroundColor: theme.cardBackground || theme.card }]}
      onPress={() => setShowTripSelector(true)}
    >
      <View style={styles.tripSelectorContent}>
        <View>
          <Text
            style={[styles.tripSelectorLabel, { color: theme.textSecondary }]}
          >
            {t("selectedTrip")}
          </Text>
          <Text style={[styles.tripSelectorName, { color: theme.text }]}>
            {selectedTrip.name}
          </Text>
          <Text
            style={[styles.tripSelectorDate, { color: theme.textSecondary }]}
          >
            {selectedTrip.date}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-down"
          size={24}
          color={theme.textSecondary}
        />
      </View>
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
      <View
        style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.cardBackground },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t("selectTrip")}
            </Text>
            <TouchableOpacity onPress={() => setShowTripSelector(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {trips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={[
                  styles.tripItem,
                  {
                    backgroundColor:
                      selectedTrip.id === trip.id
                        ? theme.primary + "20"
                        : "transparent",
                  },
                ]}
                onPress={() => {
                  setSelectedTrip(trip);
                  setShowTripSelector(false);
                }}
              >
                <View>
                  <Text style={[styles.tripItemName, { color: theme.text }]}>
                    {trip.name}
                  </Text>
                  <Text
                    style={[
                      styles.tripItemDate,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {trip.date}
                  </Text>
                </View>
                {selectedTrip.id === trip.id && (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderSummaryCard = () => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <MaterialCommunityIcons
            name="chart-box"
            size={24}
            color={theme.primary}
            style={styles.cardHeaderIcon}
          />
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t("tripSummary")}
          </Text>
        </View>
      </View>
      <View style={styles.summaryGrid}>
        <StatCard
          title={t("expense")}
          value={formatCurrency(Number(analysisData.totalExpense.toFixed(2)))}
          icon="cash-multiple"
          style={styles.summaryItem}
          valueStyle={{ fontSize: 16, fontWeight: "600" }}
        />
        <StatCard
          title={t("budget")}
          value={formatCurrency(Number(analysisData.totalBudget.toFixed(2)))}
          icon="wallet"
          style={styles.summaryItem}
          valueStyle={{ fontSize: 16, fontWeight: "600" }}
        />
        <StatCard
          title={t("perPerson")}
          value={formatCurrency(
            Number(analysisData.perPersonBudget.toFixed(2))
          )}
          icon="account-group"
          style={styles.summaryItem}
          valueStyle={{ fontSize: 16, fontWeight: "600" }}
        />
        <StatCard
          title={t("status")}
          value={
            analysisData.totalExpense > analysisData.totalBudget
              ? t("overBudget")
              : t("underBudget")
          }
          icon={
            analysisData.totalExpense > analysisData.totalBudget
              ? "alert-circle"
              : "check-circle"
          }
          trendType={
            analysisData.totalExpense > analysisData.totalBudget
              ? "negative"
              : "positive"
          }
          style={styles.summaryItem}
          valueStyle={{
            fontSize: 16,
            color:
              analysisData.totalExpense > analysisData.totalBudget
                ? theme.error
                : theme.success,
            fontWeight: "800",
          }}
        />
      </View>
    </Card>
  );

  const renderParticipantSpending = () => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {analysisData.participantCount > 0
            ? t("perPersonSpendingCount").replace("{{count}}", String(analysisData.participantCount))
            : t("noParticipants")}
        </Text>
        <MaterialCommunityIcons
          name="account-group"
          size={24}
          color={theme.primary}
        />
      </View>
      {analysisData.participants.map((participant) => (
        <View key={participant.id} style={styles.participantItem}>
          <View style={styles.participantInfo}>
            <View
              style={[
                styles.participantAvatar,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={24}
                color={theme.primary}
              />
            </View>
            <View style={styles.participantDetails}>
              <Text style={[styles.participantName, { color: theme.text }]}>
                {participant.name}
              </Text>
              <View style={styles.percentageBar}>
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${participant.percentage}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.participantPercentage,
                  { color: theme.textSecondary, fontWeight: "800" },
                ]}
              >
                {t("percentOfTotal").replace("{{percent}}", String(participant.percentage))}
              </Text>
            </View>
          </View>
          <Text style={[styles.participantAmount, { color: theme.text }]}>
            {formatCurrency(participant.spent)}
          </Text>
        </View>
      ))}
    </Card>
  );

  const renderSettlements = () => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {t("paymentSettlements")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            {t("whoNeedsToPayWhom")}
          </Text>
        </View>
        {analysisData.settlements.length > 0 ? (
          <TouchableOpacity onPress={shareWhoOwes} hitSlop={8}>
            <MaterialCommunityIcons
              name="whatsapp"
              size={24}
              color={theme.primary}
            />
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons
            name="bank-transfer"
            size={24}
            color={theme.primary}
          />
        )}
      </View>
      {analysisData.settlements.map((settlement, index) => {
        const isDebtor = currentUserId && settlement.fromId === currentUserId;
        return (
        <View key={index} style={styles.settlementItem}>
          <View style={styles.settlementRow}>
          <View style={styles.settlementContent}>
            <View style={styles.settlementFrom}>
              <View
                style={[
                  styles.settlementAvatar,
                  { backgroundColor: theme.error + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={theme.error}
                />
              </View>
              <Text style={[styles.settlementName, { color: theme.text }]}>
                {settlement.from}
              </Text>
            </View>
            <View style={styles.settlementArrow}>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={theme.textSecondary}
              />
            </View>
            <View style={styles.settlementTo}>
              <View
                style={[
                  styles.settlementAvatar,
                  { backgroundColor: theme.success + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={theme.success}
                />
              </View>
              <Text style={[styles.settlementName, { color: theme.text }]}>
                {settlement.to}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.settlementAmountContainer,
              { backgroundColor: theme.primary + "10" },
            ]}
          >
            <Text style={[styles.settlementAmount, { color: theme.primary }]}>
              {formatCurrency(settlement.amount)}
            </Text>
          </View>
          </View>
          {isDebtor ? (
            <TouchableOpacity
              style={[styles.payUpiBtn, { backgroundColor: theme.primary }]}
              onPress={() => paySettlement(settlement)}
            >
              <Text style={[styles.payUpiBtnText, { color: theme.white || "#fff" }]}>
                {t("payViaUpi")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        );
      })}
      {analysisData.settlements.length > 0 ? (
        <TouchableOpacity
          style={[styles.shareSettlementsBtn, { borderColor: theme.primary }]}
          onPress={shareWhoOwes}
        >
          <MaterialCommunityIcons name="whatsapp" size={18} color={theme.primary} />
          <Text style={[styles.shareSettlementsBtnText, { color: theme.primary }]}>
            {t("shareWhoOwes")}
          </Text>
        </TouchableOpacity>
      ) : null}
      {analysisData.settlements.length === 0 && (
        <View style={styles.emptySettlements}>
          <MaterialCommunityIcons
            name="check-circle"
            size={40}
            color={theme.success}
            style={styles.emptySettlementsIcon}
          />
            <Text
              style={[
                styles.emptySettlementsText,
                { color: theme.textSecondary },
              ]}
          >
            {t("allPaymentsSettled")}
          </Text>
        </View>
      )}
    </Card>
  );

  const analysisHeader = (
    <Header title={t("settlements")} onBack={() => navigation.goBack()} />
  );

  if (!hasFeature(FEATURES.BOARD_SETTLEMENTS)) {
    return (
      <ScreenLayout header={analysisHeader}>
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
      <ScreenLayout header={analysisHeader}>
        <AnimatedLoader context="settlements" />
      </ScreenLayout>
    );
  }

  if (missingBoardId) {
    return (
      <ScreenLayout header={analysisHeader}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="chart-box-outline"
            size={48}
            color={theme.textSecondary}
            style={styles.loadingIcon}
          />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {t("openSettlementsFromBoard")}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!selectedTrip) {
    return (
      <ScreenLayout header={analysisHeader}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t("noBoardsToSettle")}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout header={analysisHeader}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <PremiumFeatureAd style={{ marginBottom: 12 }} />
        {renderTripSelector()}
        {renderSummaryCard()}
        {renderParticipantSpending()}
        {renderSettlements()}
      </ScrollView>
      {renderTripSelectorModal()}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIcon: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  tripSelector: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    ...shadowStyle(5),
  },
  tripSelectorContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripSelectorLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  tripSelectorName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  tripSelectorDate: {
    fontSize: 14,
  },
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
  modalList: {
    maxHeight: "80%",
  },
  tripItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  tripItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  tripItemDate: {
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    ...shadowStyle(5),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: (width - 64) / 2.1,
    marginBottom: 16,
    justifyContent: "space-between",
    alignItems: "center",
  },
  participantItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  percentageBar: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    marginBottom: 4,
  },
  percentageFill: {
    height: "100%",
    borderRadius: 2,
  },
  participantPercentage: {
    fontSize: 12,
  },
  participantAmount: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 16,
  },
  settlementItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settlementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payUpiBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payUpiBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  shareSettlementsBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareSettlementsBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  settlementContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settlementFrom: {
    flexDirection: "row",
    alignItems: "center",
  },
  settlementTo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settlementAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  settlementName: {
    fontSize: 16,
    fontWeight: "500",
  },
  settlementArrow: {
    marginHorizontal: 12,
  },
  settlementAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  settlementAmountIcon: {
    marginRight: 4,
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySettlements: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptySettlementsIcon: {
    marginBottom: 12,
  },
  emptySettlementsText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
