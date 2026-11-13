import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ExpenseBoardScreen } from "../screens/ExpenseBoardScreen";
import { AnalysisScreen } from "../screens/AnalysisScreen";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { kinetic } from "../theme/tokens";

/**
 * Kinetic bottom tabs (Stitch Dashboard export).
 * Home / Boards / centre + Add FAB / Settle / Trends.
 * DECISION (live-review conflict 3): this order wins over the live
 * canvas's Home / Expenses / Plan / Analytics / Profile wording.
 * Tab screens are the real screens; the stack keeps every other route,
 * so navigation.navigate("ExpenseBoardDetails") etc. still bubble up
 * from a tab screen to the parent stack. Screens rendered as tabs must
 * pass footerRoute={null} to ScreenLayout (no legacy FooterTab) and
 * keep their ad slots explicitly (see each screen's rebuild notes).
 */
const Tab = createBottomTabNavigator();

function AddPlaceholder() {
  return <View />;
}

function FabButton(props) {
  return (
    <TouchableOpacity
      {...props}
      style={styles.fabWrap}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Add expense"
      testID="tab-add-fab"
    >
      <View style={styles.fabCircle}>
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </View>
      <Text style={styles.fabLabel}>Add</Text>
    </TouchableOpacity>
  );
}

const ICONS = {
  HomeTab: "wallet",
  BoardsTab: "folder-multiple",
  SettleTab: "swap-horizontal",
  TrendsTab: "chart-bar",
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: kinetic.colors.navy,
        tabBarInactiveTintColor: "#8899AA",
        tabBarLabelStyle: {
          fontFamily: kinetic.fonts.interMedium,
          fontSize: 11,
          lineHeight: 14,
        },
        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: kinetic.colors.card,
          borderTopWidth: 1,
          borderTopColor: kinetic.colors.border,
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={ICONS[route.name] || "circle"}
            size={size || 22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="BoardsTab"
        component={ExpenseBoardScreen}
        options={{ tabBarLabel: "Boards" }}
      />
      <Tab.Screen
        name="AddTab"
        component={AddPlaceholder}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <FabButton {...props} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("AddExpense");
          },
        })}
      />
      <Tab.Screen
        name="SettleTab"
        component={AnalysisScreen}
        options={{ tabBarLabel: "Settle" }}
      />
      <Tab.Screen
        name="TrendsTab"
        component={AnalyticsScreen}
        options={{ tabBarLabel: "Trends" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -18,
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: kinetic.colors.coral,
    alignItems: "center",
    justifyContent: "center",
    ...kinetic.shadows.ctaCoral,
  },
  fabLabel: {
    fontFamily: kinetic.fonts.interMedium,
    fontSize: 11,
    lineHeight: 14,
    color: "#8899AA",
    marginTop: 4,
  },
});
