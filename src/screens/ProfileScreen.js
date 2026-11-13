import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Header } from "../components/Header";
import { ScreenLayout } from "../components/ScreenLayout";
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
import { showToast } from "../utils/toast";
import { copyToClipboard } from "../utils/clipboard";
import { kinetic } from "../theme/tokens";
import { useFooterScrollPadding } from "../hooks/useFooterScrollPadding";

// Kinetic redesign (2026-11-13): navy gradient hero, white cards on a
// canvas background, coral CTAs. All data flows are unchanged — avatar
// upload still sends the picked uri direct to the Supabase avatars
// bucket, stats still come from the live profile queries below.
// NOTE: no lifetime "settled" total exists in the profile data
// (settlements are computed per board, never stored as a total), so the
// third stat is the real shared-member count, not an invented figure.

const C = kinetic.colors;
const T = kinetic.typography;
const R = kinetic.radii;

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
  const { t } = useTranslation();
  const scrollBottomPadding = useFooterScrollPadding(0, isTabRoot);
  const { plan, isPremium, paymentsEnabled } = useSubscription();
  const { language } = useAppSettings();
  const locale = getLocaleFromLanguage(language);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editUpiId, setEditUpiId] = useState("");
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
      setEditUpiId(userProfile?.upi_id ?? "");
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const { profile, error } = await userService.updateProfile({
        full_name: editFullName.trim() || null,
        mobile: editMobile.trim() || null,
        upi_id: editUpiId.trim().toLowerCase() || null,
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

    // NOTE: no FileSystem read here on purpose. An earlier version read
    // the file as base64 first, but its result was never used — the upload
    // below sends the uri directly — and the call itself threw on the
    // current expo-file-system (readAsStringAsync lives in /legacy only),
    // so picking an avatar always failed before the upload ran.
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

  const handleCopyUpi = () => {
    if (!userProfile?.upi_id) return;
    copyToClipboard(userProfile.upi_id);
    showToast.success(t("copied"), "UPI ID copied");
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        showToast.error(t("error"), t("failedToLogOut"));
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast.error(t("error"), t("unexpectedErrorOccurred"));
    }
  };

  const displayName =
    titleCaseName(userProfile?.full_name) ||
    titleCaseName(session?.user?.user_metadata?.full_name) ||
    "Your profile";
  const displayEmail =
    userProfile?.email_address || session?.user?.email || "No email";
  const planLabel = t(PLAN_CATALOG[plan]?.nameKey || "planFree");
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

  const renderHero = () => (
    <LinearGradient
      colors={C.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroRow}>
        <TouchableOpacity
          onPress={pickAndUploadImage}
          activeOpacity={0.85}
          style={styles.avatarPress}
          accessibilityLabel="Change profile photo"
        >
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {userProfile?.avatar_url ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarInitials}>
                  {displayName
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase() || "T"}
                </Text>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.heroText}>
          <Text style={styles.nameText} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.emailText} numberOfLines={1}>
            {displayEmail}
          </Text>
          {userProfile?.mobile ? (
            <Text style={styles.metaText}>{userProfile.mobile}</Text>
          ) : null}
          <Text style={styles.metaText}>Member since {memberSince}</Text>
          <View
            style={[
              styles.planChip,
              { backgroundColor: isPremium ? "#F97316" : "rgba(255,255,255,0.16)" },
            ]}
          >
            <MaterialCommunityIcons
              name={isPremium ? "crown" : "shield-account-outline"}
              size={13}
              color="#FFFFFF"
            />
            <Text style={styles.planChipText}>{planLabel}</Text>
          </View>
        </View>
      </View>

      {userProfile?.upi_id ? (
        <View style={styles.upiRow}>
          <MaterialCommunityIcons name="shield-check-outline" size={16} color="#FFFFFF" />
          <Text style={styles.upiText} numberOfLines={1}>
            {userProfile.upi_id}
          </Text>
          <TouchableOpacity
            onPress={handleCopyUpi}
            style={styles.copyBtn}
            accessibilityLabel="Copy UPI ID"
          >
            <MaterialCommunityIcons name="content-copy" size={14} color="#FFFFFF" />
            <Text style={styles.copyText}>Copy</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.editProfileBtn}
        onPress={handleEditProfile}
        activeOpacity={0.85}
        accessibilityLabel={isEditing ? t("cancel") : "Edit profile"}
      >
        <MaterialCommunityIcons
          name={isEditing ? "close" : "pencil-outline"}
          size={16}
          color={C.navy}
        />
        <Text style={styles.editProfileText}>
          {isEditing ? t("cancel") : "Edit Profile"}
        </Text>
      </TouchableOpacity>

      {isEditing ? (
        <View style={styles.editPanel}>
          <TextInput
            style={styles.editInput}
            value={editFullName}
            onChangeText={setEditFullName}
            placeholder="Full name"
            placeholderTextColor="rgba(255,255,255,0.6)"
            autoCapitalize="words"
          />
          <TextInput
            style={styles.editInput}
            value={editMobile}
            onChangeText={setEditMobile}
            placeholder="Mobile"
            placeholderTextColor="rgba(255,255,255,0.6)"
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.editInput}
            value={editUpiId}
            onChangeText={setEditUpiId}
            placeholder={t("upiIdPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.6)"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editBtn, styles.editBtnGhost]}
              onPress={() => setIsEditing(false)}
              disabled={savingProfile}
            >
              <Text style={[styles.editBtnText, { color: "#FFFFFF" }]}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, styles.editBtnSolid]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              <Text style={[styles.editBtnText, { color: "#FFFFFF" }]}>
                {savingProfile ? "..." : t("save")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </LinearGradient>
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
          colors={C.coralGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.premiumBanner}
        >
          <View style={styles.premiumLeft}>
            <MaterialCommunityIcons name="crown" size={18} color="#FFFFFF" />
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
      { label: "Boards", value: String(totalBoards), icon: "view-grid-outline" },
      {
        label: "Expenses",
        value: formatCurrency(totalExpenses),
        icon: "cash-multiple",
      },
      {
        label: "Members",
        value: String(totalSharedMembers),
        icon: "account-group-outline",
      },
    ];

    return (
      <View style={styles.statsCard}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={[
              styles.statCell,
              index < stats.length - 1 && styles.statCellDivider,
            ]}
          >
            <View style={styles.statIcon}>
              <MaterialCommunityIcons name={stat.icon} size={18} color={C.navy} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMenuRow = ({ icon, iconBg, title, subtitle, onPress, isLast, danger }) => (
    <TouchableOpacity
      style={[styles.menuRow, !isLast && styles.menuRowDivider]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={danger ? C.danger : C.navy}
        />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuTitle, danger && { color: C.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={C.textTertiary} />
      ) : null}
    </TouchableOpacity>
  );

  const renderAccountMeta = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.listCard}>
        {renderMenuRow({
          icon: "calendar-outline",
          iconBg: C.tintBlue,
          title: "Member since",
          subtitle: memberSince,
          onPress: undefined,
          isLast: false,
        })}
        {renderMenuRow({
          icon: "clock-outline",
          iconBg: C.tintAmber,
          title: "Last login",
          subtitle: formatDateTime(
            session?.user?.last_sign_in_at || userProfile?.updated_at,
            locale
          ),
          onPress: undefined,
          isLast: false,
        })}
        <View style={[styles.menuRow, styles.menuRowLast]}>
          <View style={[styles.menuIcon, { backgroundColor: "#FEE2E2" }]}>
            <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Google account</Text>
            <Text style={styles.menuSubtitle}>
              {isGoogleConnected ? "Connected" : "Not connected"}
            </Text>
          </View>
          {!isGoogleConnected ? (
            <TouchableOpacity
              style={styles.connectPill}
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
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Active</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderQuickLinks = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Menu</Text>
      <View style={styles.listCard}>
        {renderMenuRow({
          icon: "cog-outline",
          iconBg: C.tintBlue,
          title: "Settings",
          subtitle: "Budget, currency & preferences",
          onPress: () => navigation.navigate("Settings"),
        })}
        {renderMenuRow({
          icon: "bell-outline",
          iconBg: C.tintAmber,
          title: "Notifications",
          subtitle: "Alerts and reminders",
          onPress: () => navigation.navigate("Notification"),
        })}
        {renderMenuRow({
          icon: "account-group-outline",
          iconBg: C.tintGreen,
          title: "Invitations",
          subtitle: "Board invites sent & received",
          onPress: () => navigation.navigate("Invitations"),
        })}
        {renderMenuRow({
          icon: "help-circle-outline",
          iconBg: C.subtle,
          title: "Help & Support",
          subtitle: "Get help when you need it",
          onPress: () => {
            Alert.alert("Coming Soon", "Support features will be available soon!");
          },
        })}
        {renderMenuRow({
          icon: "information-outline",
          iconBg: C.subtle,
          title: "About",
          subtitle: "Trivense v1.0.0",
          onPress: () => {
            Alert.alert("About", `Trivense v1.0.0\n\n${t("brandTagline")}`);
          },
          isLast: true,
        })}
      </View>
    </View>
  );

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Dashboard");
  };

  if (loading) {
    return (
      <ScreenLayout
        navigation={navigation}
        footerRoute={null}
        showAdBanner={false}
        header={<Header title={t("profile")} onBack={handleBack} />}
      >
        <AnimatedLoader context="profile" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      footerRoute={null}
      showAdBanner={false}
      header={
        <Header
          title={t("profile")}
          onBack={handleBack}
          rightComponent={
            <TouchableOpacity
              onPress={handleEditProfile}
              style={styles.editHeaderBtn}
              accessibilityLabel={isEditing ? t("cancel") : "Edit profile"}
            >
              <MaterialCommunityIcons
                name={isEditing ? "close" : "pencil-outline"}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          }
        />
      }
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {renderHero()}
        {renderPremiumBanner()}
        {renderStats()}
        <Text style={[styles.sectionLabel, { marginTop: 4 }]}>
          Overview · {totalCategories} categories
        </Text>
        {renderAccountMeta()}
        {renderQuickLinks()}
        <TouchableOpacity
          testID="profile-logout-button"
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="logout" size={20} color={C.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>Trivense v1.0.0</Text>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: C.canvas,
  },
  hero: {
    borderRadius: R.xl,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    ...kinetic.shadows.elevated,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarPress: { flexShrink: 0 },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
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
    borderColor: C.navy,
    backgroundColor: C.coral,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameText: {
    ...T.displayMedium,
    color: "#FFFFFF",
  },
  emailText: {
    ...T.body,
    color: "rgba(255,255,255,0.8)",
  },
  metaText: {
    ...T.caption,
    color: "rgba(255,255,255,0.65)",
  },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: R.full,
  },
  planChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: R.md,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  upiText: {
    ...T.bodyMedium,
    color: "#FFFFFF",
    flex: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  copyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: R.md,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.navy,
  },
  editPanel: {
    width: "100%",
    marginTop: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: R.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    ...T.body,
    color: "#FFFFFF",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    justifyContent: "center",
  },
  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: R.md,
    minWidth: 100,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnGhost: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  editBtnSolid: {
    backgroundColor: C.coral,
  },
  editBtnText: { ...T.bodyMedium, fontWeight: "700" },
  premiumWrap: { marginBottom: 16 },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: R.lg,
    ...kinetic.shadows.ctaCoral,
  },
  premiumLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  premiumTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  premiumSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 1,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: "hidden",
    ...kinetic.shadows.card,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 4,
  },
  statCellDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: C.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.tintBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    ...T.headingSmall,
    color: C.textPrimary,
    textAlign: "center",
  },
  statLabel: {
    ...T.captionBold,
    color: C.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: { marginBottom: 16 },
  sectionLabel: {
    ...T.captionBold,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  listCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    overflow: "hidden",
    ...kinetic.shadows.card,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  menuRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  menuRowLast: {},
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  menuText: { flex: 1, minWidth: 0 },
  menuTitle: {
    ...T.bodyMedium,
    color: C.textPrimary,
    fontWeight: "600",
  },
  menuSubtitle: {
    ...T.caption,
    color: C.textSecondary,
    marginTop: 2,
  },
  connectPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.full,
    backgroundColor: C.navy,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  connectPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  connectedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: R.full,
    backgroundColor: C.tintGreen,
  },
  connectedText: { fontSize: 12, fontWeight: "700", color: C.success },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: R.lg,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 12,
    minHeight: 52,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.danger,
  },
  versionText: {
    ...T.caption,
    color: C.textTertiary,
    textAlign: "center",
    marginBottom: 8,
  },
  editHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});

export default ProfileScreen;
