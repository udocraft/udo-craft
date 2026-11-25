import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rateLimit } from "@/lib/rate-limit";
import { passkeyRpId, passkeyCookieOptions, PASSKEY_COOKIE } from "@/lib/auth/passkey";
import { sealPayload } from "@/lib/auth/session-link";

// POST /api/auth/passkey/login/options — discoverable login (no email needed).
export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, { scope: "passkey-login-options", limit: 30, window: 60 })).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const options = await generateAuthenticationOptions({
    rpID: passkeyRpId(req),
    userVerification: "preferred",
  });
  const res = NextResponse.json(options);
  res.cookies.set(PASSKEY_COOKIE, sealPayload({ challenge: options.challenge, flow: "login" }), passkeyCookieOptions());
  return res;
}
