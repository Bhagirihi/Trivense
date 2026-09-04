import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "../context/ThemeContext";
import { Header } from "../components/Header";
import ScreenLayout from "../components/ScreenLayout";
import { AnimatedLoader } from "../components/ui/AnimatedLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { supabase, signInWithGoogle } from "../config/supabase";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { getBoardSummaries } from "../services/boardAccessService";
import { userService } from "../services/supabaseService";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { PLAN_CATALOG } from "../config/subscriptionPlans";
import { useAppSettings } from "../context/AppSettingsContext";
import { useTranslation } from "../hooks/useTranslation";
import { devLog } from "../utils/logger";
import Card from "../components/common/Card";
import { SectionLabel, SettingsRow } from "../components/ui/UIKit";
import { layout, radii, spacing, typography } from "../theme/tokens";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getLocaleFromLanguage = (language) => {
  if (language === "hi") return "hi-IN";
  if (language === "en") return "en-US";
  return "en-IN";
};

const titleCaseName = (value) => {
  if (!value?.trim()) return "";
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

export const ProfileScreen = ({ navigation }) => {
  const route = useRoute();
  const isTabRoot = route.params?.tabRoot === true;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = useFooterScrollPadding(0, isTabRoot);
  const { plan, isPremium, paymentsEnabled } = useSubscription();
  const { language } = useAppSettings();
  const locale = getLocaleFromLanguage(language);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalBoards, setTotalBoards] = useState(0);
  const [totalSharedMembers, setTotalSharedMembers] = useState(0);
  const { session } = useAuth();
  const isGoogleConnected =
    session?.user?.identities?.some((i) => i.provider === "google") ?? false;

  const accountStatics = useCallback(async () => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    try {
      const [boardsRes, categoriesRes, sharedRes, summaries] = await Promise.all([
        supabase
          .from("expense_boards")
          .select("id", { count: "exact", head: true })
          .eq("created_by", userId),
        supabase
          .from("categories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("shared_users")
          .select("id", { count: "exact", head: true })
          .eq("shared_by", userId),
        getBoardSummaries({ force: true }),
      ]);

      const expenseTotal = (summaries || []).reduce(
        (sum, board) => sum + (Number(board.totalExpenses) || 0),
        0
      );

      setTotalExpenses(expenseTotal);
      setTotalCategories(categoriesRes.count || 0);
      setTotalBoards(boardsRes.count || 0);
      setTotalSharedMembers(sharedRes.count || 0);
    } catch (error) {
      console.error("Error loading account stats:", error.message);
    }
  }, [session?.user?.id]);

  const fetchUserProfile = useCallback(async () => {
    try {
      if (!session?.user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      await accountStatics();
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      Alert.alert(t("error"), t("failedToLoadProfile"));
    } finally {
      setLoading(false);
    }
  }, [session?.user, accountStatics, t]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleEditProfile = () => {
    if (!isEditing) {
      setEditFullName(userProfile?.full_name ?? "");
      setEditMobile(userProfile?.mobile ?? "");
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const { profile, error } = await userService.updateProfile({
        full_name: editFullName.trim() || null,
        mobile: editMobile.trim() || null,
      });
      if (error) throw error;
      setUserProfile(profile);
      setIsEditing(false);
      Alert.alert(
        t("success") || "Success",
        t("profileUpdated") || "Profile updated successfully"
      );
    } catch (err) {
      Alert.alert(t("error") || "Error", err?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadImageToSupabase = async (ImageData) => {
    const { uri } = ImageData.assets[0];
    const userId = session?.user?.id;
    if (!userId) throw new Error("User not logged in");

    await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const fileExt = uri.split(".").pop()?.split("?")[0] || "jpg";
    const filename = `${Date.now()}.${fileExt}`;
    const path = `${userId}/${filename}`;
    const fileType = `image/${fileExt}`;
    const file = { uri, name: filename, type: fileType };

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: fileType });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    return publicUrl;
  };

  const pickAndUploadImage = async () => {
    try {
      if (!session?.user?.id) throw new Error("User ID is missing.");

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please grant photo library access to upload images"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled) return;

      const publicUrl = await uploadImageToSupabase(result);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", session.user.id);

      if (error) devLog("error", error);
      setUserProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error("Image Upload Error:", error.message);
      Alert.alert("Error", "Something went wrong while uploading image.");
    }
  };

  const displayName =
    titleCaseName(userProfile?.full_name) ||
    titleCaseName(session?.user?.user_metadata?.full_name) ||
    "Your profile";
  const displayEmail =
    userProfile?.email_address || session?.user?.email || "No email";
  const planLabel = t(PLAN_CATALOG[plan]?.nameKey || "planFree");

  const renderIdentity = () => (
    <View style={styles.identityBlock}>
      <TouchableOpacity
        onPress={pickAndUploadImage}
        activeOpacity={0.85}
        style={styles.avatarPress}
      >
        <View style={[styles.avatarRing, { borderColor: theme.primary }]}>
          <View
            style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}
          >
            {userProfile?.avatar_url ? (
              <Image
                source={{ uri: userProfile.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.avatarInitials, { color: theme.primary }]}>
                {displayName
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase() || "T"}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.cameraBadge,
              { backgroundColor: theme.primary, borderColor: theme.surface },
            ]}
          >
            <MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>

      {isEditing ? (
        <View style={styles.editPanel}>
          <TextInput
            style={[
              styles.editInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
            value={editFullName}
            onChangeText={setEditFullName}
            placeholder="Full name"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
          />
          <Text style={[styles.emailText, { color: theme.textSecondary }]}>
            {displayEmail}
          </Text>
          <TextInput
            style={[
              styles.editInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
            value={editMobile}
            onChangeText={setEditMobile}
            placeholder="Mobile"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: theme.borderLight }]}
              onPress={() => setIsEditing(false)}
              disabled={savingProfile}
            >
              <Text style={[styles.editBtnText, { color: theme.text }]}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              <Text style={[styles.editBtnText, { color: theme.white }]}>
                {savingProfile ? "..." : t("save")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.identityText}>
          <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text
            style={[styles.emailText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {displayEmail}
          </Text>
          {userProfile?.mobile ? (
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {userProfile.mobile}
            </Text>
          ) : null}
          <View
            style={[
              styles.planChip,
              {
                backgroundColor: isPremium
                  ? "rgba(201,162,39,0.15)"
                  : theme.primaryMuted,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isPremium ? "crown" : "shield-account-outline"}
              size={13}
              color={isPremium ? "#B8960C" : theme.primary}
            />
            <Text
              style={[
                styles.planChipText,
                { color: isPremium ? "#8A7018" : theme.primary },
              ]}
            >
              {planLabel}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderPremiumBanner = () => {
    if (isPremium || !paymentsEnabled) return null;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("Paywall")}
        style={styles.premiumWrap}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.premiumBanner}
        >
          <View style={styles.premiumLeft}>
            <MaterialCommunityIcons name="crown" size={18} color="#E8C547" />
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumSub}>
                Unlimited boards, sharing & export
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderStats = () => {
    const stats = [
      {
        icon: "cash-multiple",
        label: "Expenses",
        value: formatCurrency(totalExpenses),
        color: theme.primary,
      },
      {
        icon: "view-grid-outline",
        label: "Boards",
        value: String(totalBoards),
        color: theme.accent,
      },
      {
        icon: "tag-outline",
        label: "Categories",
        value: String(totalCategories),
        color: theme.warning,
      },
      {
        icon: "account-group-outline",
        label: "Members",
        value: String(totalSharedMembers),
        color: theme.info,
      },
    ];

    return (
      <View style={styles.section}>
        <SectionLabel title="Overview" style={{ marginTop: 0, marginBottom: spacing.sm }} />
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {stats.map((stat, index) => (
            <View
              key={stat.label}
              style={[
                styles.statCell,
                index % 2 === 0 && styles.statCellLeft,
                index < 2 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
                index % 2 === 0 && {
                  borderRightWidth: StyleSheet.hairlineWidth,
                  borderRightColor: theme.border,
                },
              ]}
            >
              <View
                style={[styles.statIcon, { backgroundColor: `${stat.color}14` }]}
              >
                <MaterialCommunityIcons
                  name={stat.icon}
                  size={16}
                  color={stat.color}
                />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderAccountMeta = () => {
    const memberSince = (() => {
      const date = session?.user?.created_at || userProfile?.created_at;
      return date
        ? new Date(date).toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—";
    })();

    return (
      <View style={styles.section}>
        <SectionLabel title="Account" style={{ marginBottom: spacing.sm }} />
        <Card padding="none" variant="flat" style={styles.listCard}>
          <SettingsRow
            icon="calendar-outline"
            iconColor={theme.primary}
            title="Member since"
            subtitle={memberSince}
            showChevron={false}
          />
          <SettingsRow
            icon="clock-outline"
            iconColor={theme.accent}
            title="Last login"
            subtitle={formatDateTime(
              session?.user?.last_sign_in_at || userProfile?.updated_at,
              locale
            )}
            showChevron={false}
          />
          <SettingsRow
            icon="google"
            iconColor="#DB4437"
            iconBg="#FEE2E2"
            title="Google account"
            subtitle={isGoogleConnected ? "Connected" : "Not connected"}
            showChevron={false}
            rightElement={
              !isGoogleConnected ? (
                <TouchableOpacity
                  style={[styles.connectPill, { backgroundColor: theme.primary }]}
                  onPress={async () => {
                    try {
                      const { error } = await signInWithGoogle();
                      if (
                        error &&
                        !error?.message?.toLowerCase().includes("cancelled")
                      ) {
                        Alert.alert(
                          t("error"),
                          error?.message || "Failed to connect Google"
                        );
                      }
                    } catch (e) {
                      Alert.alert(
                        t("error"),
                        e?.message || "Failed to connect Google"
                      );
                    }
                  }}
                >
                  <Text style={styles.connectPillText}>Connect</Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.connectedBadge,
                    { backgroundColor: `${theme.success}18` },
                  ]}
                >
                  <Text style={[styles.connectedText, { color: theme.success }]}>
                    Active
                  </Text>
                </View>
              )
            }
            isLast
          />
        </Card>
      </View>
    );
  };

  const renderQuickLinks = () => {
    const items = [
      {
        icon: "cog-outline",
        iconColor: theme.primary,
        title: "Settings",
        subtitle: "Budget, currency & preferences",
        onPress: () => navigation.navigate("Settings"),
      },
      {
        icon: "bell-outline",
        iconColor: theme.warning,
        title: "Notifications",
        subtitle: "Alerts and reminders",
        onPress: () => navigation.navigate("Notification"),
      },
      {
        icon: "help-circle-outline",
        iconColor: theme.info,
        title: "Help & Support",
        subtitle: "Get help when you need it",
        onPress: () => {
          Alert.alert("Coming Soon", "Support features will be available soon!");
        },
      },
      {
        icon: "information-outline",
        iconColor: theme.textSecondary,
        title: "About",
        subtitle: "Trivense v1.0.0",
        onPress: () => {
          Alert.alert("About", `Trivense v1.0.0\n\n${t("brandTagline")}`);
        },
        isLast: true,
      },
    ];

    return (
      <View style={styles.section}>
        <SectionLabel title="Quick links" style={{ marginBottom: spacing.sm }} />
        <Card padding="none" variant="flat" style={styles.listCard}>
          {items.map((item, index) => (
            <SettingsRow
              key={item.title}
              icon={item.icon}
              iconColor={item.iconColor}
              title={item.title}
              subtitle={item.subtitle}
              onPress={item.onPress}
              isLast={item.isLast || index === items.length - 1}
            />
          ))}
        </Card>
      </View>
    );
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Dashboard");
  };

  const editButton = (
    <TouchableOpacity
      onPress={handleEditProfile}
      style={[
        styles.editHeaderBtn,
        { backgroundColor: "rgba(255,255,255,0.12)" },
      ]}
      accessibilityLabel={isEditing ? t("cancel") : "Edit profile"}
    >
      <MaterialCommunityIcons
        name={isEditing ? "close" : "pencil-outline"}
        size={18}
        color={theme.headerText || "#FFFFFF"}
      />
    </TouchableOpacity>
  );

  const profileHeader = (
    <Header
      title={t("profile")}
      onBack={handleBack}
      rightComponent={loading ? null : editButton}
    />
  );

  if (loading) {
    return (
      <ScreenLayout
        navigation={navigation}
        footerRoute={isTabRoot ? "Profile" : null}
        showAdBanner={false}
        header={profileHeader}
      >
        <AnimatedLoader context="profile" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      footerRoute={isTabRoot ? "Profile" : null}
      showAdBanner={false}
      header={profileHeader}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingBottom: isTabRoot
            ? scrollBottomPadding
            : spacing.xxl + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {renderIdentity()}
        {renderPremiumBanner()}
        {renderStats()}
        {renderAccountMeta()}
        {renderQuickLinks()}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: { ...typography.caption },
  identityBlock: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatarPress: { marginBottom: spacing.md },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  identityText: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
  },
  nameText: {
    ...typography.h2,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  emailText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  metaText: {
    fontSize: 12,
    textAlign: "center",
  },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  planChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  editPanel: {
    width: "100%",
    marginTop: spacing.xs,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...typography.body,
    textAlign: "center",
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
    justifyContent: "center",
  },
  editBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    minWidth: 100,
    alignItems: "center",
  },
  editBtnText: { ...typography.label },
  premiumWrap: { marginBottom: spacing.lg },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
  },
  premiumLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  premiumTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  premiumSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 1,
  },
  section: { marginBottom: spacing.lg },
  statsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  statCell: {
    width: "50%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statCellLeft: {},
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  listCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  connectPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  connectPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  connectedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  connectedText: { fontSize: 12, fontWeight: "700" },
  editHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ProfileScreen;
