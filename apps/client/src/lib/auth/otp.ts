import { createHmac, randomInt } from "crypto";

export const OTP_TTL_MS = 15 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpState = {
  hash?: string | null;
  expires?: number | null;
  attempts?: number | null;
};

export type OtpCheck = "ok" | "invalid" | "expired" | "locked" | "missing";

/** Six digits from a CSPRNG (Math.random is predictable). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Keyed hash so a leaked user_metadata row does not reveal the code. */
export function hashOtp(otp: string, email: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error("OTP_PEPPER is not configured");
  return createHmac("sha256", pepper)
    .update(`${email.trim().toLowerCase()}:${otp}`)
    .digest("hex");
}

export function checkOtp(
  state: OtpState,
  otp: string,
  email: string,
  now: number = Date.now(),
): OtpCheck {
  if (!state.hash || !state.expires) return "missing";
  if (now > state.expires) return "expired";
  if ((state.attempts ?? 0) >= OTP_MAX_ATTEMPTS) return "locked";
  return hashOtp(otp, email) === state.hash ? "ok" : "invalid";
}
