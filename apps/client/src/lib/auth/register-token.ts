import { createHmac, timingSafeEqual } from "crypto";
import { hashOtp, OTP_TTL_MS } from "@/lib/auth/otp";

/**
 * Stateless proof that a sign-up code was emailed to an address. The server makes the
 * code, emails it and hands the browser this token: { e: email, h: keyed hash of the
 * code, x: expiry }, HMAC-signed with OTP_PEPPER. The browser never sees the code itself,
 * so /api/auth/register only creates an account for someone who read that inbox.
 */
interface Payload {
  e: string;
  h: string;
  x: number;
}

function key(): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error("OTP_PEPPER is not configured");
  return pepper;
}

const normalize = (email: string) => email.trim().toLowerCase();

export function sealRegisterToken(email: string, code: string, now = Date.now()): string {
  const payload: Payload = { e: normalize(email), h: hashOtp(code, email), x: now + OTP_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export type RegisterTokenCheck = "ok" | "invalid" | "expired";

export function checkRegisterToken(token: string, email: string, code: string, now = Date.now()): RegisterTokenCheck {
  const [body, sig] = token.split(".");
  if (!body || !sig) return "invalid";
  const expected = createHmac("sha256", key()).update(body).digest();
  const received = Buffer.from(sig, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return "invalid";
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return "invalid";
  }
  if (payload.e !== normalize(email)) return "invalid";
  if (typeof payload.x !== "number" || now > payload.x) return "expired";
  const h = Buffer.from(hashOtp(code, email));
  const want = Buffer.from(String(payload.h));
  return h.length === want.length && timingSafeEqual(h, want) ? "ok" : "invalid";
}
