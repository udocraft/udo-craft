import { createHmac, timingSafeEqual } from "crypto";
import type { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Creates a one-time token the browser exchanges for a real Supabase session via
 * supabase.auth.verifyOtp({ type: "magiclink", token_hash }). Nothing is emailed.
 */
export async function issueSessionTokenHash(service: ServiceClient, email: string): Promise<string> {
  const { data, error } = await service.auth.admin.generateLink({ type: "magiclink", email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) throw error ?? new Error("Could not create session token");
  return hashed;
}

/** HMAC key for short-lived passkey cookies. Reuses the service key so no new secret is needed. */
function cookieKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

/** Sealed payloads expire server-side too, not only through the cookie's maxAge. */
const SEAL_TTL_SECONDS = 300;

export function sealPayload(payload: object, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: nowSeconds + SEAL_TTL_SECONDS })).toString("base64url");
  const sig = createHmac("sha256", cookieKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function openPayload<T>(sealed: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)): T | null {
  if (!sealed) return null;
  const [body, sig] = sealed.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", cookieKey()).update(body).digest();
  const received = Buffer.from(sig, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
    if (typeof data.exp !== "number" || data.exp < nowSeconds) return null;
    return data;
  } catch {
    return null;
  }
}
