import { describe, expect, it, vi } from "vitest";
import { jsonPost } from "../../_test/helpers";

vi.mock("@/lib/rate-limit", () => ({ consumeLimit: async () => true }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/supabase/users", () => ({ findUserByEmail: async () => null }));
const sent: { html: string }[] = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (msg: { html: string }) => { sent.push(msg); return { error: null }; } };
  },
}));
process.env.OTP_PEPPER = "test-pepper";

import { POST } from "./route";
import { checkRegisterToken } from "@/lib/auth/register-token";

describe("POST /api/auth/send-otp validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/auth/send-otp", "{nope"))).status).toBe(400);
  });

  it("400 for a missing or invalid email", async () => {
    for (const body of [{}, { email: "nope", otp: "123456" }, { email: ["a@b.co"] }]) {
      expect((await POST(jsonPost("/api/auth/send-otp", body))).status).toBe(400);
    }
  });

  it("400 for an unknown type or a client OTP that is not 6 digits", async () => {
    expect((await POST(jsonPost("/api/auth/send-otp", { email: "a@b.co", type: "admin" }))).status).toBe(400);
    expect((await POST(jsonPost("/api/auth/send-otp", { email: "a@b.co", type: "register", otp: "<b>1</b>" }))).status).toBe(400);
  });

  it("register: the server makes and emails the code, and returns only a signed token", async () => {
    const res = await POST(jsonPost("/api/auth/send-otp", { email: "a@b.co", type: "register" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const code = sent.at(-1)!.html.match(/>(\d{6})</)![1];
    expect(JSON.stringify(body)).not.toContain(code);
    expect(checkRegisterToken(body.token, "a@b.co", code)).toBe("ok");
    expect(checkRegisterToken(body.token, "a@b.co", code === "000000" ? "111111" : "000000")).toBe("invalid");
  });

  it("answers success for a reset of an unknown address (no enumeration)", async () => {
    const res = await POST(jsonPost("/api/auth/send-otp", { email: "ghost@example.com", type: "reset" }));
    expect(res.status).toBe(200);
  });
});
