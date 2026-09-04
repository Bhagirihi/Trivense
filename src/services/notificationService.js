import { supabase } from "../config/supabase";
import { getCurrentUser } from "../utils/supabaseAuth";

export const notificationService = {
  // Get all notifications for the current user
  getNotifications: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  // Get single notification details
  getNotificationDetails: async (notificationId) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notificationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching notification details:", error);
      throw error;
    }
  },

  // Mark a notification as read
  markAsRead: async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },

  // Get unread notifications count
  getUnreadCount: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user found");

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  },

  // Create a new notification
  createNotification: async (notification) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: user.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            trip_name: notification.tripName,
            read: false,
            icon: notification.icon,
            icon_color: notification.iconColor,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },
};
