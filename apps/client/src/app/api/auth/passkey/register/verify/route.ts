import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { passkeyOrigin, passkeyRpId, passkeyCookieOptions, PASSKEY_COOKIE } from "@/lib/auth/passkey";
import { openPayload } from "@/lib/auth/session-link";

// POST /api/auth/passkey/register/verify — body: { response: RegistrationResponseJSON }
// Creates the account with an UNCONFIRMED email and stores the passkey. No session is
// issued here: the client sends Supabase's confirmation email, and the user signs in with
// the passkey after confirming. This stops anyone from claiming an address they don't own.
export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, { scope: "passkey-register", limit: 10, window: 60 })).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const pending = openPayload<{ challenge: string; flow: string; email: string; name: string }>(
    req.cookies.get(PASSKEY_COOKIE)?.value
  );
  const body = (await req.json().catch(() => null)) as { response?: RegistrationResponseJSON } | null;
  if (!pending || pending.flow !== "register" || !body?.response) {
    return NextResponse.json({ error: "Registration session expired. Try again." }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: pending.challenge,
      expectedOrigin: passkeyOrigin(req),
      expectedRPID: passkeyRpId(req),
    });
  } catch {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const service = createServiceClient();

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: pending.email,
    email_confirm: false,
    user_metadata: { full_name: pending.name },
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: "This email is already registered. Sign in instead." }, { status: 409 });
  }

  const { error: insertErr } = await service.from("passkey_credentials").insert({
    credential_id: credential.id,
    user_id: created.user.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: body.response.response.transports ?? null,
  });
  if (insertErr) {
    await service.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Could not save passkey" }, { status: 500 });
  }

  const res = NextResponse.json({ needsConfirmation: true, email: pending.email });
  res.cookies.set(PASSKEY_COOKIE, "", { ...passkeyCookieOptions(), maxAge: 0 });
  return res;
}
