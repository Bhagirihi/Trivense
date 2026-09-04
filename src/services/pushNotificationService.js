import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "../config/supabase";
import { formatCurrency } from "../utils/formatters";

export async function registerForPushNotificationsAsync({
  requestPermission = true,
} = {}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    if (!requestPermission) {
      return null;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data ?? null;
    if (token) await savePushTokenToProfile(session.user.id, token);
    return token;
  } catch (e) {
    console.error("Error getting push token:", e);
    return null;
  }
}

export async function requestNotificationPermissionFromSetup() {
  return registerForPushNotificationsAsync({ requestPermission: true });
}

async function savePushTokenToProfile(userId, expoPushToken) {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ expo_push_token: expoPushToken })
      .eq("id", userId);
    if (error) {
      console.error("Error saving push token to profile:", error.message);
    }
  } catch (e) {
    console.error("Error saving push token:", e);
  }
}

export async function sendPushNotification(title, message, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      sound: "default",
      data,
    },
    trigger: null,
  });
}

export async function sendNotification(payloadOrType, titleArg, messageArg, tripNameArg, iconArg, iconColorArg) {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return null;
    }

    const payload =
      typeof payloadOrType === "object" && payloadOrType !== null
        ? payloadOrType
        : {
            type: payloadOrType || "info",
            title: titleArg || "New Notification",
            message: messageArg || "You have a new notification!",
            tripName: tripNameArg,
            icon: iconArg || "dots-horizontal",
            iconColor: iconColorArg || "#000000",
          };

    const { error } = await supabase.from("notifications").insert([
      {
        user_id: session.user.id,
        type: payload.type || "info",
        title: payload.title,
        message: payload.message,
        trip_name: payload.tripName ?? payload.boardName ?? null,
        icon: payload.icon || "dots-horizontal",
        icon_color: payload.iconColor || "#000000",
        read: false,
      },
    ]);

    if (error) {
      console.error("Error sending notification:", error.message);
      throw new Error(error.message);
    }
  } catch (err) {
    console.error("sendNotification error:", err.message);
  }
}

export function handleForegroundNotifications() {
  Notifications.addNotificationReceivedListener((notification) => {
    console.log("Notification received in foreground:", notification);
  });
}

export function handleBackgroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function sendCreateExpenseBoardNotification({
  boardName,
  icon,
  iconColor,
}) {
  await sendNotification({
    type: "info",
    title: "Expense board created",
    message: "Your expense board has been created successfully",
    tripName: boardName,
    icon,
    iconColor,
  });

  await sendPushNotification(
    "Expense board created",
    `Your expense board "${boardName}" has been created successfully`
  );
}

export async function sendExpenseBoardInviteNotification({
  boardName,
  inviteeName,
  icon,
  iconColor,
}) {
  await sendNotification({
    type: "info",
    title: "Expense board invited",
    message: "You have been invited to an expense board",
    tripName: boardName || inviteeName,
    icon,
    iconColor,
  });
  await sendPushNotification(
    "Expense board invited",
    `You have been invited to an expense board${boardName ? `: ${boardName}` : ""}`
  );
}

export async function sendExpenseBoardDeletedNotification({
  boardName,
  icon = "view-grid",
  iconColor,
}) {
  await sendNotification({
    type: "info",
    title: "Expense board deleted",
    message: `"${boardName}" has been deleted.`,
    tripName: boardName,
    icon,
    iconColor,
  });
  await sendPushNotification(
    "Expense board deleted",
    `Expense board "${boardName}" has been deleted`
  );
}

export async function sendCreateExpenseNotification({
  boardName,
  icon,
  iconColor,
  expenseName,
  expenseAmount,
}) {
  await sendNotification({
    type: "info",
    title: "Expense created",
    message: `You created an expense of ${formatCurrency(expenseAmount)}.`,
    tripName: boardName,
    icon,
    iconColor,
  });
  await sendPushNotification(
    "Expense created",
    `${expenseName}: ${formatCurrency(expenseAmount)}`
  );
}

export async function sendCreateCategoryNotification({
  boardName,
  icon,
  iconColor,
  categoryName,
}) {
  await sendNotification({
    type: "info",
    title: "Category created",
    message: "You have created a category",
    tripName: boardName,
    icon,
    iconColor,
  });
  await sendPushNotification(
    "Category created",
    `Category "${categoryName}" was created`
  );
}

export async function sendDeleteCategoryNotification({
  boardName,
  icon,
  iconColor,
  categoryName,
}) {
  await sendNotification({
    type: "info",
    title: "Category deleted",
    message: "You have deleted a category",
    tripName: boardName,
    icon,
    iconColor,
  });
  await sendPushNotification(
    "Category deleted",
    `Category "${categoryName}" was deleted`
  );
}

export async function sendUpdateCategoryNotification({
  boardName,
  icon,
  iconColor,
  categoryName,
}) {
  await sendNotification({
    type: "info",
    title: "Category updated",
    message: "You have updated a category",
    tripName: boardName,
    icon,
    iconColor,
  });
  await sendPushNotification(
    "Category updated",
    `Category "${categoryName}" was updated`
  );
}

export async function sendExpenseOverBudgetNotification({
  boardName,
  icon,
  iconColor,
  budgetAmount,
  expenseAmount,
}) {
  await sendNotification({
    type: "warning",
    title: "Expense over budget",
    message: `Spending on "${boardName}" has reached ${formatCurrency(expenseAmount)} of ${formatCurrency(budgetAmount)}.`,
    tripName: boardName,
    icon: icon || "alert",
    iconColor: iconColor || "#F44336",
  });
  await sendPushNotification(
    "Expense over budget",
    `"${boardName}" is at ${formatCurrency(expenseAmount)}`
  );
}

export async function sendExpenseDeletedNotification({
  boardName = "Board",
  icon = "dots-horizontal",
  iconColor = "#000000",
  expenseName = "Expense",
  expenseAmount = 0,
}) {
  await sendNotification({
    type: "info",
    title: "Expense deleted",
    message: `You deleted ${expenseName} (${formatCurrency(expenseAmount)}).`,
    tripName: boardName,
    icon,
    iconColor,
  });
  await sendPushNotification(
    "Expense deleted",
    `${expenseName} removed from ${boardName}`
  );
}
