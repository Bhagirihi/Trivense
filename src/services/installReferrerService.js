import { Platform } from "react-native";
import { setPendingReferralCode } from "../utils/referralStorage";
import { devLog } from "../utils/logger";
import { hasCustomNativeModules } from "../utils/nativeRuntime";

function parseInviteFromReferrer(referrer) {
  if (!referrer) return null;
  const match = referrer.match(/(?:^|&?)invite=([^&]+)/i);
  return match?.[1]?.trim().toUpperCase() || null;
}

/**
 * On Android, read Play Install Referrer once after a Play Store install
 * (referrer=invite%3DCODE in the store URL).
 */
export async function capturePlayStoreReferrerInvite() {
  if (Platform.OS !== "android" || !hasCustomNativeModules()) {
    return null;
  }

  try {
    const module = await import("react-native-play-install-referrer");
    const PlayInstallReferrer = module.default || module;

    return await new Promise((resolve) => {
      PlayInstallReferrer.getInstallReferrerInfo((info, error) => {
        if (error) {
          devLog("Install referrer unavailable:", error);
          resolve(null);
          return;
        }
        resolve(parseInviteFromReferrer(info?.installReferrer));
      });
    });
  } catch (error) {
    devLog("Install referrer module unavailable:", error?.message);
    return null;
  }
}

export async function bootstrapPlayStoreReferralInvite() {
  const code = await capturePlayStoreReferrerInvite();
  if (code) {
    await setPendingReferralCode(code);
  }
  return code;
}
