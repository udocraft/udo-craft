import { type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RateLimitOptions {
  /** Separate counter per scope, e.g. "leads" or "upload". */
  scope: string;
  limit: number;
  window: number; // seconds
}

export function extractIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.ip ?? "unknown";
}

/**
 * Counts one hit against `key` in the shared database and reports whether it is
 * within `limit` for the current window. Fails open if the database is unreachable,
 * so an outage does not block checkout; the failure is logged.
 */
export async function consumeLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createServiceClient().rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request", err);
    return true;
  }
}

export async function rateLimit(request: NextRequest, options: RateLimitOptions): Promise<{ success: boolean }> {
  const success = await consumeLimit(`${options.scope}:${extractIp(request)}`, options.limit, options.window);
  return { success };
}
