import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTelegramLogin } from "@/lib/auth/telegram";
import { issueSessionTokenHash } from "@/lib/auth/session-link";
import { parseJsonBody } from "@/lib/api/request";
import { TelegramLoginRequestSchema } from "@udo-craft/shared";

// POST /api/auth/telegram — body is the object returned by the Telegram Login widget.
// Verifies the signature, finds or creates the linked account, and returns a token_hash
// that the browser exchanges for a session with verifyOtp({ type: "magiclink" }).
export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, { scope: "telegram-login", limit: 20, window: 60 })).success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return NextResponse.json({ error: "Telegram login is not configured" }, { status: 503 });

  const parsed = await parseJsonBody(req, TelegramLoginRequestSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, unknown>;
  if (!verifyTelegramLogin(body, botToken)) {
    return NextResponse.json({ error: "Invalid Telegram login" }, { status: 401 });
  }

  const telegramId = String(body.id);
  const service = createServiceClient();

  const { data: link, error: linkErr } = await service
    .from("social_identities")
    .select("user_id")
    .eq("provider", "telegram")
    .eq("provider_uid", telegramId)
    .maybeSingle();
  if (linkErr) return NextResponse.json({ error: "Login failed" }, { status: 500 });

  let userId = link?.user_id as string | undefined;
  if (!userId) {
    const name = [body.first_name, body.last_name].filter(Boolean).join(" ") || undefined;
    // Telegram does not provide an email, so the account gets a synthetic, confirmed address.
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: `telegram-${telegramId}@users.telegram.udocraft.invalid`,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        telegram_id: telegramId,
        telegram_username: body.username ?? null,
      },
    });
    if (createErr || !created.user) return NextResponse.json({ error: "Login failed" }, { status: 500 });
    userId = created.user.id;
    const { error: insertErr } = await service
      .from("social_identities")
      .insert({ provider: "telegram", provider_uid: telegramId, user_id: userId });
    if (insertErr) return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }

  const { data: userData, error: userErr } = await service.auth.admin.getUserById(userId);
  if (userErr || !userData.user?.email) return NextResponse.json({ error: "Login failed" }, { status: 500 });

  try {
    const token_hash = await issueSessionTokenHash(service, userData.user.email);
    return NextResponse.json({ token_hash, type: "magiclink" });
  } catch (err) {
    console.error("[telegram-login] session token failed", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
