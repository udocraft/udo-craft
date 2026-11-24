import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { parseJsonBody } from "@/lib/api/request";
import { PasskeyVerifyRequestSchema } from "@udo-craft/shared";
import { rateLimit } from "@/lib/rate-limit";
import {
  passkeyOrigin,
  passkeyRpId,
  passkeyCookieOptions,
  PASSKEY_COOKIE,
} from "@/lib/auth/passkey";
import { issueSessionTokenHash, openPayload } from "@/lib/auth/session-link";

// POST /api/auth/passkey/login/verify — body: { response: AuthenticationResponseJSON }
export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, { scope: "passkey-login", limit: 20, window: 60 })).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const pending = openPayload<{ challenge: string; flow: string }>(req.cookies.get(PASSKEY_COOKIE)?.value);
  const parsed = await parseJsonBody(req, PasskeyVerifyRequestSchema);
  if (!parsed.ok) return parsed.response;
  // Shape checked above; the full WebAuthn structure is verified by @simplewebauthn/server.
  const body = parsed.data as unknown as { response: AuthenticationResponseJSON };
  if (!pending || pending.flow !== "login" || !body.response.id) {
    return NextResponse.json({ error: "Passkey session expired. Try again." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: cred } = await service
    .from("passkey_credentials")
    .select("credential_id, user_id, public_key, counter, transports")
    .eq("credential_id", body.response.id)
    .maybeSingle();
  if (!cred) return NextResponse.json({ error: "Passkey not recognised" }, { status: 401 });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: pending.challenge,
      expectedOrigin: passkeyOrigin(req),
      expectedRPID: passkeyRpId(req),
      credential: {
        id: cred.credential_id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: Number(cred.counter),
        transports: (cred.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      },
    });
  } catch {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 401 });
  }
  if (!verification.verified) return NextResponse.json({ error: "Passkey verification failed" }, { status: 401 });

  await service
    .from("passkey_credentials")
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq("credential_id", cred.credential_id);

  const { data: userData, error: userErr } = await service.auth.admin.getUserById(cred.user_id);
  const user = userData?.user;
  if (userErr || !user?.email) return NextResponse.json({ error: "Login failed" }, { status: 500 });
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "Confirm your email first. Check your inbox." }, { status: 403 });
  }

  const token_hash = await issueSessionTokenHash(service, user.email);
  const res = NextResponse.json({ token_hash, type: "magiclink" });
  res.cookies.set(PASSKEY_COOKIE, "", { ...passkeyCookieOptions(), maxAge: 0 });
  return res;
}
