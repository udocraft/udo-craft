import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "@/lib/supabase/env";

export function createServiceClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();
  const safeUrl = url && url.startsWith("http") ? url : "https://placeholder.supabase.co";
  const safeKey = serviceRoleKey || "placeholder";

  return createClient(safeUrl, safeKey);
}
