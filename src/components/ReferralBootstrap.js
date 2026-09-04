import React, { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { referralService } from "../services/referralService";
import { showToast } from "../utils/toast";
import { devLog } from "../utils/logger";
import { useTranslation } from "../hooks/useTranslation";

/**
 * Applies a pending referral code after the user authenticates (email verify or Google).
 */
export default function ReferralBootstrap() {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const { t } = useTranslation();
  const applyingRef = useRef(false);
  const lastUserIdRef = useRef(null);

  useEffect(() => {
    if (!user?.id || !user?.email_confirmed_at) return;
    if (applyingRef.current || lastUserIdRef.current === user.id) return;

    applyingRef.current = true;
    lastUserIdRef.current = user.id;

    (async () => {
      try {
        const result = await referralService.applyPendingReferralForUser(user.id);
        if (result.skipped || result.error) return;

        await refreshSubscription();
        showToast.success(
          t("referralApplied"),
          result.data?.message || t("referralRewardHint")
        );
      } catch (error) {
        devLog("ReferralBootstrap error:", error?.message);
      } finally {
        applyingRef.current = false;
      }
    })();
  }, [user?.id, user?.email_confirmed_at, refreshSubscription]);

  return null;
}
