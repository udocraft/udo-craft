import { createHash, createHmac, timingSafeEqual } from "crypto";

/** Fields the Telegram Login widget sends back. `hash` is the HMAC over the rest. */
export interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** Login data older than this is rejected (replay protection). */
export const TELEGRAM_MAX_AGE_SECONDS = 86400;

/**
 * Verifies a Telegram Login payload per https://core.telegram.org/widgets/login#checking-authorization:
 * secret = SHA256(bot_token); expected = HMAC-SHA256(secret, sorted "key=value" lines without hash).
 */
export function verifyTelegramLogin(
  data: Record<string, unknown>,
  botToken: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!botToken || typeof data.hash !== "string" || typeof data.id !== "number") return false;
  if (typeof data.auth_date !== "number") return false;
  if (nowSeconds - data.auth_date > TELEGRAM_MAX_AGE_SECONDS) return false;

  const checkString = Object.keys(data)
    .filter((key) => key !== "hash" && data[key] !== undefined && data[key] !== null)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  const received = Buffer.from(data.hash, "hex");
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
