import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { runCheck, checkSentryDsn, checkClarityId, buildDeploymentInfo } from "./utils";
import type { HealthCheck, AdminHealthResponse } from "./types";

const ADMIN_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLIENT_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SENTRY_DSN",
  "HARD_RESET_ENABLED",
] as const;

const ADMIN_CLARITY_ID = "w6t8md9b3l";

async function checkSupabaseDb(): Promise<Omit<HealthCheck, "service">> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: "error", latency_ms: null, detail: "Missing Supabase credentials" };
  const supabase = createServiceClient(url, key);
  const start = Date.now();
  const { error } = await supabase.from("leads").select("id").limit(1);
  const latency_ms = Date.now() - start;
  if (error) return { status: "error", latency_ms, detail: error.message };
  return { status: "ok", latency_ms, detail: null };
}

async function checkSupabaseAuth(): Promise<Omit<HealthCheck, "service">> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: "error", latency_ms: null, detail: "Missing Supabase credentials" };
  const supabase = createServiceClient(url, key);
  const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
  if (error) return { status: "error", latency_ms: null, detail: error.message };
  return { status: "ok", latency_ms: null, detail: null };
}

async function checkSupabaseStorage(): Promise<Omit<HealthCheck, "service">> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: "error", latency_ms: null, detail: "Missing Supabase credentials" };
  const supabase = createServiceClient(url, key);
  const { error } = await supabase.storage.listBuckets();
  if (error) return { status: "error", latency_ms: null, detail: error.message };
  return { status: "ok", latency_ms: null, detail: null };
}

async function checkSupabaseRealtime(): Promise<Omit<HealthCheck, "service">> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: "error", latency_ms: null, detail: "Missing Supabase credentials" };
  const supabase = createServiceClient(url, key);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ status: "error", latency_ms: null, detail: "Connection timeout" });
    }, 5000);
    const channel = supabase.channel("health-check");
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        supabase.removeChannel(channel);
        resolve({ status: "ok", latency_ms: null, detail: null });
      }
    });
  });
}

async function checkTelegram(): Promise<Omit<HealthCheck, "service">> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { status: "error", latency_ms: null, detail: "Bot token not configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    if (!data.ok) return { status: "degraded", latency_ms: null, detail: data.description ?? "Telegram API error" };
    if (data.result?.url) return { status: "ok", latency_ms: null, detail: data.result.url };
    return { status: "degraded", latency_ms: null, detail: "No webhook registered" };
  } catch (err) {
    return { status: "error", latency_ms: null, detail: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function fetchClientHealth(clientUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${clientUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Client returned ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Build env map
  const env: Record<string, boolean> = {};
  for (const key of ADMIN_ENV_VARS) {
    env[key] = !!process.env[key];
  }

  // Run all admin checks + client fetch concurrently
  const [dbResult, authResult, storageResult, realtimeResult, telegramResult, sentryResult, clarityResult, clientResult] =
    await Promise.allSettled([
      runCheck("Supabase DB", checkSupabaseDb),
      runCheck("Supabase Auth", checkSupabaseAuth),
      runCheck("Supabase Storage", checkSupabaseStorage),
      runCheck("Supabase Realtime", checkSupabaseRealtime),
      runCheck("Telegram", checkTelegram),
      Promise.resolve({ service: "Sentry", ...checkSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN) }),
      Promise.resolve({ service: "Clarity", ...checkClarityId(ADMIN_CLARITY_ID) }),
      (async () => {
        const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL;
        if (!clientUrl) throw new Error("NEXT_PUBLIC_CLIENT_URL not configured");
        return fetchClientHealth(clientUrl);
      })(),
    ]);

  const adminChecks: HealthCheck[] = [
    dbResult.status === "fulfilled" ? dbResult.value : { service: "Supabase DB", status: "error", latency_ms: null, detail: (dbResult as PromiseRejectedResult).reason?.message ?? "Unknown" },
    authResult.status === "fulfilled" ? authResult.value : { service: "Supabase Auth", status: "error", latency_ms: null, detail: (authResult as PromiseRejectedResult).reason?.message ?? "Unknown" },
    storageResult.status === "fulfilled" ? storageResult.value : { service: "Supabase Storage", status: "error", latency_ms: null, detail: (storageResult as PromiseRejectedResult).reason?.message ?? "Unknown" },
    realtimeResult.status === "fulfilled" ? realtimeResult.value : { service: "Supabase Realtime", status: "error", latency_ms: null, detail: (realtimeResult as PromiseRejectedResult).reason?.message ?? "Unknown" },
    telegramResult.status === "fulfilled" ? telegramResult.value : { service: "Telegram", status: "error", latency_ms: null, detail: (telegramResult as PromiseRejectedResult).reason?.message ?? "Unknown" },
    sentryResult.status === "fulfilled" ? sentryResult.value : { service: "Sentry", status: "error", latency_ms: null, detail: "Unknown" },
    clarityResult.status === "fulfilled" ? clarityResult.value : { service: "Clarity", status: "error", latency_ms: null, detail: "Unknown" },
  ];

  let clientSection: AdminHealthResponse["client"];
  if (clientResult.status === "fulfilled") {
    clientSection = clientResult.value;
  } else {
    const detail = clientResult.reason instanceof Error ? clientResult.reason.message : "Client app unreachable";
    clientSection = {
      status: "error",
      detail,
      checks: [{ service: "Client App", status: "error", latency_ms: null, detail }],
    };
  }

  const response: AdminHealthResponse = {
    checked_at: new Date().toISOString(),
    admin: {
      checks: adminChecks,
      env,
      deployment: buildDeploymentInfo(),
    },
    client: clientSection,
  };

  return NextResponse.json(response);
}
