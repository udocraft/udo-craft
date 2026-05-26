import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/auth/verify-otp
// Verifies OTP, sets new password, clears OTP from metadata.
export async function POST(req: NextRequest) {
  const { email, otp, newPassword } = await req.json();
  if (!email || !otp || !newPassword) {
    return NextResponse.json({ error: "email, otp та newPassword обов'язкові" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Пароль має містити щонайменше 8 символів" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: list, error: listErr } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const user = list.users.find((u) => u.email === email);
  if (!user) return NextResponse.json({ error: "Невірний код або користувача не знайдено" }, { status: 400 });

  const storedOtp = user.user_metadata?.reset_otp;
  const expiresAt = user.user_metadata?.reset_otp_expires;

  if (!storedOtp || storedOtp !== otp) {
    return NextResponse.json({ error: "Невірний код" }, { status: 400 });
  }
  if (!expiresAt || Date.now() > expiresAt) {
    return NextResponse.json({ error: "Код застарів. Запросіть новий." }, { status: 400 });
  }

  // Set new password + clear OTP
  const { error: updateErr } = await service.auth.admin.updateUserById(user.id, {
    password: newPassword,
    user_metadata: {
      ...user.user_metadata,
      reset_otp: null,
      reset_otp_expires: null,
    },
  });

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
