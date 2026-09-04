import Toast from "react-native-toast-message";
import NetInfo from "@react-native-community/netinfo";

export const showToast = {
  success: (message, description = "") => {
    Toast.show({
      type: "success",
      text1: message,
      text2: description,
      position: "top",
      visibilityTime: 3000,
      autoHide: true,
    });
  },
  error: (message, description = "") => {
    Toast.show({
      type: "error",
      text1: message,
      text2: description,
      position: "top",
      visibilityTime: 3000,
      autoHide: true,
    });
  },
  info: (message, description = "") => {
    Toast.show({
      type: "info",
      text1: message,
      text2: description,
      position: "top",
      visibilityTime: 3000,
      autoHide: true,
    });
  },
};

/** Prefer this for network-dependent failures so offline users get a clear hint. */
export async function showNetworkAwareError(message, description = "") {
  try {
    const state = await NetInfo.fetch();
    const offline =
      state.isConnected === false || state.isInternetReachable === false;
    if (offline) {
      showToast.error(
        message,
        description || "You're offline. Reconnect and try again."
      );
      return;
    }
  } catch {
    // fall through
  }
  showToast.error(message, description);
}
