import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonPost } from "../../_test/helpers";

const created: Record<string, unknown>[] = [];
let createError: { message: string } | null = null;
vi.mock("@/lib/rate-limit", () => ({ consumeLimit: async () => true }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    auth: { admin: { createUser: async (args: Record<string, unknown>) => { created.push(args); return { error: createError }; } } },
  }),
}));
process.env.OTP_PEPPER = "test-pepper";

import { POST } from "./route";
import { sealRegisterToken } from "@/lib/auth/register-token";

const base = { email: "Ira@Example.com", password: "longenough1", name: "Ira" };

describe("POST /api/auth/register", () => {
  beforeEach(() => { created.length = 0; createError = null; });

  it("400 without a token or with a short password", async () => {
    expect((await POST(jsonPost("/api/auth/register", { ...base, otp: "123456" }))).status).toBe(400);
    const token = sealRegisterToken(base.email, "123456");
    expect((await POST(jsonPost("/api/auth/register", { ...base, otp: "123456", token, password: "short" }))).status).toBe(400);
  });

  it("rejects a wrong code and creates nothing", async () => {
    const token = sealRegisterToken(base.email, "123456");
    const res = await POST(jsonPost("/api/auth/register", { ...base, otp: "654321", token }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("code_invalid");
    expect(created).toHaveLength(0);
  });

  it("creates a confirmed, lower-cased account for the right code", async () => {
    const token = sealRegisterToken(base.email, "123456");
    const res = await POST(jsonPost("/api/auth/register", { ...base, otp: "123456", token }));
    expect(res.status).toBe(200);
    expect(created[0]).toMatchObject({ email: "ira@example.com", email_confirm: true, password: "longenough1" });
  });

  it("409 when the email already has an account", async () => {
    createError = { message: "A user with this email address has already been registered" };
    const token = sealRegisterToken(base.email, "123456");
    const res = await POST(jsonPost("/api/auth/register", { ...base, otp: "123456", token }));
    expect(res.status).toBe(409);
  });
});
