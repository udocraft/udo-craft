import { NextRequest, NextResponse } from "next/server";
import { RegisterRequestSchema } from "@udo-craft/shared";
import { parseJsonBody } from "@/lib/api/request";
import { createServiceClient } from "@/lib/supabase/service";
import { emailLimitKey } from "@/lib/auth/otp";
import { checkRegisterToken } from "@/lib/auth/register-token";
import { consumeLimit } from "@/lib/rate-limit";

// POST /api/auth/register
// Creates an account only after the emailed code is checked on the server, so the person
// signing up has proven they own the address. Orders and chats are matched to accounts by
// email, so an unproven address would expose someone else's orders.
export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, RegisterRequestSchema);
  if (!parsed.ok) return parsed.response;
  const { email, otp, token, password, name, company, phone } = parsed.data;

  if (!(await consumeLimit(`otp-verify:${emailLimitKey(email)}`, 5, 900))) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  let check: ReturnType<typeof checkRegisterToken>;
  try {
    check = checkRegisterToken(token, email, otp);
  } catch (e) {
    console.error("[register] OTP_PEPPER missing", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (check === "expired") return NextResponse.json({ error: "code_expired" }, { status: 400 });
  if (check !== "ok") return NextResponse.json({ error: "code_invalid" }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: name || undefined, company: company || undefined, phone: phone || undefined },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return NextResponse.json({ error: exists ? "email_exists" : "server_error" }, { status: exists ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
