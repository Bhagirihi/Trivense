import { createServerSupabase } from "@/lib/supabase/server";

export type AppConfig = {
  paymentsEnabled: boolean;
  updatedAt: string | null;
};

const DEFAULT_CONFIG: AppConfig = {
  paymentsEnabled: true,
  updatedAt: null,
};

export async function getAppConfig(): Promise<AppConfig> {
  const supabase = createServerSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("app_config")
    .select("payments_enabled, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    paymentsEnabled: data.payments_enabled ?? true,
    updatedAt: data.updated_at ?? null,
  };
}

export async function setPaymentsEnabled(enabled: boolean): Promise<AppConfig> {
  const supabase = createServerSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("app_config")
    .upsert(
      {
        id: 1,
        payments_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("payments_enabled, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    paymentsEnabled: data.payments_enabled ?? enabled,
    updatedAt: data.updated_at ?? null,
  };
}
