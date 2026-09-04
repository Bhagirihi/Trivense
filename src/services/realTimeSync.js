import { supabase } from "../config/supabase";
import { devLog } from "../utils/logger";

let channelSeq = 0;

/** Unique physical channel name — avoids double-subscribe when effects remount. */
function uniqueChannelName(prefix) {
  channelSeq += 1;
  return `${prefix}-${channelSeq}`;
}

function removeStaleChannels(prefix) {
  const topicPrefix = `realtime:${prefix}`;
  supabase.getChannels().forEach((ch) => {
    if (ch.topic === topicPrefix || ch.topic?.startsWith(`${topicPrefix}-`)) {
      supabase.removeChannel(ch);
    }
  });
}

/**
 * @param {string} prefix - Logical channel prefix (used for cleanup of stale channels)
 * @param {(channel: import("@supabase/supabase-js").RealtimeChannel) => import("@supabase/supabase-js").RealtimeChannel} configure
 * @param {(status: string) => void} [onStatus]
 */
function subscribeChannel(prefix, configure, onStatus) {
  removeStaleChannels(prefix);
  const name = uniqueChannelName(prefix);
  const channel = configure(supabase.channel(name));
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      devLog(`✅ Subscribed to ${prefix}`);
    } else if (status === "CHANNEL_ERROR") {
      console.error(`❌ Error subscribing to ${prefix}`);
    }
    onStatus?.(status);
  });
  return () => {
    supabase.removeChannel(channel);
    devLog(`🧹 Unsubscribed from ${prefix}`);
  };
}

/**
 * @param {() => void} callback - Called when any subscribed table changes
 * @param {string} [channelName] - Logical channel prefix
 */
export function realTimeSync(callback, channelName = "realtime-dashboard") {
  return subscribeChannel(channelName, (channel) =>
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, callback)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, callback)
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_boards" }, callback)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, callback)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, callback)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_users" }, callback)
  );
}

realTimeSync.subscribeToExpense = (callback, channelName = "realtime-expenses") =>
  subscribeChannel(channelName, (channel) =>
    channel.on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, callback)
  );

realTimeSync.subscribeToExpenseBoard = (callback, channelName = "realtime-expense-boards") =>
  subscribeChannel(channelName, (channel) =>
    channel.on("postgres_changes", { event: "*", schema: "public", table: "expense_boards" }, callback)
  );

realTimeSync.subscribeToCategory = (callback, channelName = "realtime-categories") =>
  subscribeChannel(channelName, (channel) =>
    channel.on("postgres_changes", { event: "*", schema: "public", table: "categories" }, callback)
  );

realTimeSync.subscribeToNotifications = (callback, channelName = "realtime-notifications") => {
  const unsubscribe = subscribeChannel(channelName, (channel) =>
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications" },
      async (payload) => {
        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("id", payload.new.id)
          .single();
        callback(data);
      }
    )
  );
  return { unsubscribe };
};

// No "verification" table in schema; auth state is used for email verification.
realTimeSync.subscribeToVerification = () => () => {};
