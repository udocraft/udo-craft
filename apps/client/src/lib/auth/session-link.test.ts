import { beforeAll, describe, expect, it } from "vitest";
import { openPayload, sealPayload } from "./session-link";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

describe("sealPayload / openPayload", () => {
  it("round-trips a payload", () => {
    expect(openPayload<{ challenge: string }>(sealPayload({ challenge: "abc" }))?.challenge).toBe("abc");
  });
  it("rejects a tampered payload", () => {
    const [body, sig] = sealPayload({ challenge: "abc" }).split(".");
    const forged = Buffer.from(JSON.stringify({ challenge: "evil", exp: 9e9 })).toString("base64url");
    expect(openPayload(`${forged}.${sig}`)).toBeNull();
    expect(openPayload(`${body}.x${sig}`)).toBeNull();
  });
  it("rejects an expired payload", () => {
    const sealed = sealPayload({ challenge: "abc" }, 1000);
    expect(openPayload(sealed, 1000 + 301)).toBeNull();
    expect(openPayload(sealed, 1000 + 299)).not.toBeNull();
  });
});
