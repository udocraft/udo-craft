"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authCallbackUrl } from "@/lib/auth/redirect";

const TELEGRAM_SCRIPT = "https://telegram.org/js/telegram-widget.js?22";
export const TELEGRAM_BOT_ID = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID?.trim() ?? "";
/** Google needs the provider enabled in Supabase Auth. Off until NEXT_PUBLIC_AUTH_GOOGLE=1. */
export const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";
/** Passkeys need the social_and_passkey_auth migration applied. Off until NEXT_PUBLIC_AUTH_PASSKEY=1. */
export const PASSKEY_ENABLED = process.env.NEXT_PUBLIC_AUTH_PASSKEY === "1";
const CALLBACK = () => authCallbackUrl("/cabinet");

const GENERIC_ERROR = "Не вдалося увійти. Спробуйте ще раз.";

type TelegramLoginUser = Record<string, unknown>;
interface TelegramGlobal {
  Login?: {
    auth: (opts: { bot_id: number; request_access?: boolean }, cb: (user: TelegramLoginUser | false) => void) => void;
  };
}

function loadTelegramScript(): Promise<TelegramGlobal> {
  const w = window as unknown as { Telegram?: TelegramGlobal };
  if (w.Telegram?.Login) return Promise.resolve(w.Telegram);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TELEGRAM_SCRIPT;
    script.async = true;
    script.onload = () => (w.Telegram?.Login ? resolve(w.Telegram) : reject(new Error("telegram")));
    script.onerror = () => reject(new Error("telegram"));
    document.head.appendChild(script);
  });
}

async function exchangeTokenHash(supabase: SupabaseClient, tokenHash: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  return error ? GENERIC_ERROR : null;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data: data as Record<string, unknown> & { error?: string; token_hash?: string } };
}

/** Telegram Login: returns an error message, or null on success (session is set). */
export async function loginWithTelegram(supabase: SupabaseClient): Promise<string | null> {
  try {
    const tg = await loadTelegramScript();
    const user = await new Promise<TelegramLoginUser | false>((resolve) =>
      tg.Login!.auth({ bot_id: Number(TELEGRAM_BOT_ID), request_access: true }, resolve)
    );
    if (!user) return "Вхід через Telegram скасовано.";
    const { ok, data } = await postJson("/api/auth/telegram", user);
    if (!ok || !data.token_hash) return data.error ?? GENERIC_ERROR;
    return exchangeTokenHash(supabase, data.token_hash);
  } catch {
    return GENERIC_ERROR;
  }
}

/** Passkey sign-in (discoverable credential, no email typed). */
export async function loginWithPasskey(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { ok, data: optionsJSON } = await postJson("/api/auth/passkey/login/options", {});
    if (!ok) return GENERIC_ERROR;
    const response = await startAuthentication({ optionsJSON: optionsJSON as never });
    const { ok: verified, data } = await postJson("/api/auth/passkey/login/verify", { response });
    if (!verified || !data.token_hash) return data.error ?? GENERIC_ERROR;
    return exchangeTokenHash(supabase, data.token_hash);
  } catch {
    return "Passkey скасовано або не підтримується на цьому пристрої.";
  }
}

/**
 * Passkey sign-up. Creates the account (email unconfirmed), stores the passkey, then asks
 * Supabase to send the confirmation email. Returns an error, or null when the email was sent.
 */
export async function registerWithPasskey(
  supabase: SupabaseClient,
  name: string,
  email: string
): Promise<string | null> {
  try {
    const { ok, data: optionsJSON } = await postJson("/api/auth/passkey/register/options", { name, email });
    if (!ok) return optionsJSON.error ?? GENERIC_ERROR;
    const response = await startRegistration({ optionsJSON: optionsJSON as never });
    const { ok: verified, data } = await postJson("/api/auth/passkey/register/verify", { response });
    if (!verified) return data.error ?? GENERIC_ERROR;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: CALLBACK() },
    });
    return error ? "Passkey збережено, але лист не надіслано. Спробуйте «Надіслати ще раз» пізніше." : null;
  } catch {
    return "Passkey скасовано або не підтримується на цьому пристрої.";
  }
}
