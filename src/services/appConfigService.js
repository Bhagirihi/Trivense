import { supabase } from "../config/supabase";
import { devError } from "../utils/logger";

const DEFAULT_CONFIG = {
  paymentsEnabled: true,
};

export const appConfigService = {
  async fetchConfig() {
    try {
      const { data, error } = await supabase
        .from("app_config")
        .select("payments_enabled")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        devError("appConfigService.fetchConfig error:", error.message);
        return { ...DEFAULT_CONFIG };
      }

      return {
        paymentsEnabled: data?.payments_enabled ?? DEFAULT_CONFIG.paymentsEnabled,
      };
    } catch (error) {
      devError("appConfigService.fetchConfig error:", error);
      return { ...DEFAULT_CONFIG };
    }
  },
};
