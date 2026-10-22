import { beforeEach, describe, expect, test } from "vitest";
import { checkOtp, generateOtp, hashOtp, OTP_MAX_ATTEMPTS } from "./otp";

const EMAIL = "admin@example.com";

beforeEach(() => {
  process.env.OTP_PEPPER = "test-pepper";
});

function state(otp: string, overrides: Partial<{ expires: number; attempts: number }> = {}) {
  return {
    hash: hashOtp(otp, EMAIL),
    expires: Date.now() + 60_000,
    attempts: 0,
    ...overrides,
  };
}

describe("generateOtp", () => {
  test("returns six digits", () => {
    for (let i = 0; i < 50; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
});

describe("hashOtp", () => {
  test("never equals the plaintext code and depends on the pepper", () => {
    const hash = hashOtp("123456", EMAIL);
    expect(hash).not.toContain("123456");
    process.env.OTP_PEPPER = "other";
    expect(hashOtp("123456", EMAIL)).not.toBe(hash);
  });

  test("throws when the pepper is missing", () => {
    delete process.env.OTP_PEPPER;
    expect(() => hashOtp("123456", EMAIL)).toThrow();
  });
});

describe("checkOtp", () => {
  test("accepts the correct code", () => {
    expect(checkOtp(state("654321"), "654321", EMAIL)).toBe("ok");
  });

  test("rejects a wrong code", () => {
    expect(checkOtp(state("654321"), "000000", EMAIL)).toBe("invalid");
  });

  test("rejects an expired code even if correct", () => {
    const expired = state("654321", { expires: Date.now() - 1 });
    expect(checkOtp(expired, "654321", EMAIL)).toBe("expired");
  });

  test("locks after the maximum number of attempts, even with the right code", () => {
    const locked = state("654321", { attempts: OTP_MAX_ATTEMPTS });
    expect(checkOtp(locked, "654321", EMAIL)).toBe("locked");
  });

  test("reports missing when no code was issued", () => {
    expect(checkOtp({}, "654321", EMAIL)).toBe("missing");
  });
});
