import { supabase } from "../config/supabase";
import {
  clearPendingReferralCode,
  getPendingReferralCode,
  hasAppliedReferralForUser,
  markReferralAppliedForUser,
  normalizeReferralCode,
} from "../utils/referralStorage";
import { devError } from "../utils/logger";

export const referralService = {
  normalizeReferralCode,

  async applyReferralCode(code) {
    const normalized = normalizeReferralCode(code);
    if (!normalized) {
      return { data: null, error: new Error("Enter a referral code") };
    }

    const { data, error } = await supabase.rpc("apply_referral_code", {
      p_code: normalized,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    await clearPendingReferralCode();
    return { data, error: null };
  },

  async applyPendingReferralForUser(userId) {
    if (!userId) return { data: null, error: null, skipped: true };

    if (await hasAppliedReferralForUser(userId)) {
      return { data: null, error: null, skipped: true };
    }

    const pendingCode = await getPendingReferralCode();
    if (!pendingCode) {
      return { data: null, error: null, skipped: true };
    }

    const { data, error } = await this.applyReferralCode(pendingCode);

    if (error) {
      const message = error.message?.toLowerCase() || "";
      if (
        message.includes("already used") ||
        message.includes("within 7 days") ||
        message.includes("cannot use your own")
      ) {
        await clearPendingReferralCode();
        await markReferralAppliedForUser(userId);
      }
      devError("applyPendingReferralForUser:", error.message);
      return { data: null, error, skipped: false };
    }

    await markReferralAppliedForUser(userId);
    return { data, error: null, skipped: false };
  },

  async getMyReferrals() {
    const { data, error } = await supabase.rpc("get_my_referrals");
    if (error) {
      devError("getMyReferrals:", error.message);
      throw new Error(error.message);
    }
    return Array.isArray(data) ? data : [];
  },
};
