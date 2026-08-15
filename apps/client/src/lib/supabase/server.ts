import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();
  const safeUrl = url && url.startsWith("http") ? url : "https://placeholder.supabase.co";
  const safeAnonKey = anonKey || "placeholder";

  return createServerClient(
    safeUrl,
    safeAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — safe to ignore
          }
        },
      },
    }
  );
}
