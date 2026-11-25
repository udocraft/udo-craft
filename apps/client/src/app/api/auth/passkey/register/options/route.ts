import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createServiceClient } from "@/lib/supabase/service";
import { findUserByEmail } from "@/lib/supabase/users";
import { rateLimit } from "@/lib/rate-limit";
import { passkeyRpId, passkeyCookieOptions, PASSKEY_COOKIE, PASSKEY_RP_NAME } from "@/lib/auth/passkey";
import { sealPayload } from "@/lib/auth/session-link";
import { parseJsonBody } from "@/lib/api/request";
import { PasskeyRegisterOptionsRequestSchema } from "@udo-craft/shared";

// POST /api/auth/passkey/register/options — body: { name, email }
export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, { scope: "passkey-register", limit: 10, window: 60 })).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const parsed = await parseJsonBody(req, PasskeyRegisterOptionsRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { name, email } = parsed.data;

  const service = createServiceClient();
  if (await findUserByEmail(service, email)) {
    return NextResponse.json({ error: "This email is already registered. Sign in instead." }, { status: 409 });
  }

  const normalized = email.trim().toLowerCase();
  const options = await generateRegistrationOptions({
    rpName: PASSKEY_RP_NAME,
    rpID: passkeyRpId(req),
    userName: normalized,
    userDisplayName: name.trim(),
    userID: new TextEncoder().encode(randomUUID()),
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  const res = NextResponse.json(options);
  res.cookies.set(
    PASSKEY_COOKIE,
    sealPayload({ challenge: options.challenge, flow: "register", email: normalized, name: name.trim() }),
    passkeyCookieOptions()
  );
  return res;
}
