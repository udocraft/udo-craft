import { describe, expect, it, vi } from "vitest";
import { jsonPost } from "../../_test/helpers";

vi.mock("@/lib/rate-limit", () => ({ consumeLimit: async () => true }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/supabase/users", () => ({ findUserByEmail: async () => null }));

import { POST } from "./route";

describe("POST /api/auth/verify-otp validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/auth/verify-otp", "{nope"))).status).toBe(400);
  });

  it("400 when a field is missing", async () => {
    for (const body of [{}, { email: "a@b.co", otp: "123456" }, { email: "a@b.co", newPassword: "longenough1" }]) {
      expect((await POST(jsonPost("/api/auth/verify-otp", body))).status).toBe(400);
    }
  });

  it("400 for a short password, with the message the form shows", async () => {
    const res = await POST(jsonPost("/api/auth/verify-otp", { email: "a@b.co", otp: "123456", newPassword: "short" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/8/);
  });

  it("400 when the code is not 6 digits", async () => {
    const res = await POST(jsonPost("/api/auth/verify-otp", { email: "a@b.co", otp: "12", newPassword: "longenough1" }));
    expect(res.status).toBe(400);
  });
});
