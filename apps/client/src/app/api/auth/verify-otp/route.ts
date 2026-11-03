import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { findUserByEmail } from "@/lib/supabase/users";
import { checkOtp, emailLimitKey, type OtpState } from "@/lib/auth/otp";
import { consumeLimit } from "@/lib/rate-limit";

// POST /api/auth/verify-otp
// Verifies the reset code (hashed, expiring, attempt-limited, single use),
// then sets the new password.
export async function POST(req: NextRequest) {
  const { email, otp, newPassword } = await req.json();
  if (!email || !otp || !newPassword) {
    return NextResponse.json({ error: "email, otp та newPassword обов'язкові" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Пароль має містити щонайменше 8 символів" }, { status: 400 });
  }

  if (!(await consumeLimit(`otp-verify:${emailLimitKey(email)}`, 5, 900))) {
    return NextResponse.json({ error: "Забагато спроб. Запросіть новий код." }, { status: 429 });
  }

  const service = createServiceClient();

  const user = await findUserByEmail(service, email);
  if (!user) return NextResponse.json({ error: "Невірний код або користувача не знайдено" }, { status: 400 });

  const meta = user.user_metadata ?? {};
  const state: OtpState = {
    hash: meta.reset_otp_hash ?? null,
    expires: meta.reset_otp_expires ?? null,
    attempts: meta.reset_otp_attempts ?? 0,
  };

  let result: ReturnType<typeof checkOtp>;
  try {
    result = checkOtp(state, String(otp), email);
  } catch (e) {
    console.error("[verify-otp] OTP_PEPPER missing", e);
    return NextResponse.json({ error: "Не вдалося перевірити код" }, { status: 500 });
  }

  if (result === "locked") {
    return NextResponse.json({ error: "Забагато спроб. Запросіть новий код." }, { status: 429 });
  }
  if (result === "expired") {
    return NextResponse.json({ error: "Код застарів. Запросіть новий." }, { status: 400 });
  }
  if (result === "missing" || result === "invalid") {
    if (result === "invalid") {
      await service.auth.admin.updateUserById(user.id, {
        user_metadata: { ...meta, reset_otp_attempts: (state.attempts ?? 0) + 1 },
      });
    }
    return NextResponse.json({ error: "Невірний код" }, { status: 400 });
  }

  const { error: updateErr } = await service.auth.admin.updateUserById(user.id, {
    password: newPassword,
    user_metadata: {
      ...meta,
      reset_otp: null,
      reset_otp_hash: null,
      reset_otp_expires: null,
      reset_otp_attempts: null,
    },
  });

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
