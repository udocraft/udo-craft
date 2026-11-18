import type { NextRequest } from "next/server";

export const PASSKEY_COOKIE = "udo_passkey";
export const PASSKEY_RP_NAME = "U:DO CRAFT";

/** Relying party ID: the bare hostname. Set PASSKEY_RP_ID to pin it (e.g. "udocraft.com"). */
export function passkeyRpId(req: NextRequest): string {
  return process.env.PASSKEY_RP_ID?.trim() || req.nextUrl.hostname;
}

/** Expected origin of the WebAuthn ceremony. Set PASSKEY_ORIGIN to pin it. */
export function passkeyOrigin(req: NextRequest): string {
  return process.env.PASSKEY_ORIGIN?.trim() || req.nextUrl.origin;
}

export function passkeyCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/passkey",
    maxAge: 300,
  };
}
