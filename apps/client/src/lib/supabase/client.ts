import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { url, anonKey } = getSupabasePublicEnv();
  const safeUrl = url && url.startsWith("http") ? url : "https://placeholder.supabase.co";
  const safeAnonKey = anonKey || "placeholder";

  supabaseClient = createBrowserClient(
    safeUrl,
    safeAnonKey
  );

  return supabaseClient;
}
