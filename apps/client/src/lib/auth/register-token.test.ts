import { beforeAll, describe, expect, it } from "vitest";
import { checkRegisterToken, sealRegisterToken } from "./register-token";

beforeAll(() => {
  process.env.OTP_PEPPER = "test-pepper";
});

describe("register token", () => {
  it("accepts the emailed code for the same address (any case)", () => {
    const t = sealRegisterToken("Ira@Example.com", "123456", 1000);
    expect(checkRegisterToken(t, "ira@example.com", "123456", 2000)).toBe("ok");
  });
  it("rejects a wrong code, another address, a forged token", () => {
    const t = sealRegisterToken("ira@example.com", "123456", 1000);
    expect(checkRegisterToken(t, "ira@example.com", "654321", 2000)).toBe("invalid");
    expect(checkRegisterToken(t, "eve@example.com", "123456", 2000)).toBe("invalid");
    const [body] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "eve@example.com", h: "x", x: 9e15 })).toString("base64url");
    expect(checkRegisterToken(`${forged}.${t.split(".")[1]}`, "eve@example.com", "123456", 2000)).toBe("invalid");
    expect(checkRegisterToken(`${body}.`, "ira@example.com", "123456", 2000)).toBe("invalid");
  });
  it("expires after 15 minutes", () => {
    const t = sealRegisterToken("ira@example.com", "123456", 0);
    expect(checkRegisterToken(t, "ira@example.com", "123456", 15 * 60 * 1000 + 1)).toBe("expired");
  });
});
