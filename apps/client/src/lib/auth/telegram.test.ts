import { createHash, createHmac } from "crypto";
import { describe, expect, test } from "vitest";
import { verifyTelegramLogin } from "./telegram";

const BOT_TOKEN = "123456:TEST-token";
const NOW = 1_800_000_000;

function sign(fields: Record<string, string | number>) {
  const check = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return { ...fields, hash };
}

const base = { id: 42, first_name: "Ann", auth_date: NOW - 60 };

describe("verifyTelegramLogin", () => {
  test("accepts a correctly signed, fresh payload", () => {
    expect(verifyTelegramLogin(sign(base), BOT_TOKEN, NOW)).toBe(true);
  });

  test("rejects a tampered field", () => {
    expect(verifyTelegramLogin({ ...sign(base), id: 43 }, BOT_TOKEN, NOW)).toBe(false);
  });

  test("rejects a payload signed with another bot token", () => {
    expect(verifyTelegramLogin(sign(base), "999:other", NOW)).toBe(false);
  });

  test("rejects stale auth_date", () => {
    const old = sign({ id: 42, auth_date: NOW - 90000 });
    expect(verifyTelegramLogin(old, BOT_TOKEN, NOW)).toBe(false);
  });

  test("rejects a missing hash or empty bot token", () => {
    expect(verifyTelegramLogin(base, BOT_TOKEN, NOW)).toBe(false);
    expect(verifyTelegramLogin(sign(base), "", NOW)).toBe(false);
  });
});
