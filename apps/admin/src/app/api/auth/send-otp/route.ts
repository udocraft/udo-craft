import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendResetPasswordEmail } from "@/lib/email/send";
import { generateOtp, hashOtp, OTP_TTL_MS } from "@/lib/auth/otp";

// POST /api/auth/send-otp
// Issues a 6-digit reset code. Only a keyed hash is stored, with expiry and an
// attempt counter that verify-otp enforces.
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const service = createServiceClient();

  const { data: list, error: listErr } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const user = list.users.find((u) => u.email === email);
  if (!user) {
    // Same response as a real user to avoid email enumeration
    return NextResponse.json({ ok: true });
  }

  const otp = generateOtp();
  let otpHash: string;
  try {
    otpHash = hashOtp(otp, email);
  } catch (e) {
    console.error("[send-otp] OTP_PEPPER missing", e);
    return NextResponse.json({ error: "Не вдалося створити код" }, { status: 500 });
  }

  // Remove any legacy plaintext code and reset the attempt counter
  await service.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      reset_otp: null,
      reset_otp_hash: otpHash,
      reset_otp_expires: Date.now() + OTP_TTL_MS,
      reset_otp_attempts: 0,
    },
  });

  try {
    await sendResetPasswordEmail({ to: email, otp });
  } catch (e) {
    console.error("[send-otp] email failed:", e);
    return NextResponse.json({ error: "Не вдалося надіслати email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
