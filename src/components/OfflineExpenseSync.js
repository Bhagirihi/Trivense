import { useEffect } from "react";
import { useNetwork } from "../context/NetworkContext";
import { useAuth } from "../context/AuthContext";
import { flushOfflineExpenseQueue } from "../utils/offlineExpenseQueue";

/** Sync locally queued expenses when connectivity returns. */
export default function OfflineExpenseSync() {
  const { isOffline } = useNetwork();
  const { session } = useAuth();

  useEffect(() => {
    if (isOffline || !session?.user?.id) return;
    flushOfflineExpenseQueue().catch(() => {});
  }, [isOffline, session?.user?.id]);

  return null;
}
