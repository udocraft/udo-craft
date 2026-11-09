import { describe, expect, it, vi } from "vitest";
import { jsonPost } from "../../_test/helpers";

vi.mock("@/lib/rate-limit", () => ({ consumeLimit: async () => true }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/supabase/users", () => ({ findUserByEmail: async () => null }));

import { POST } from "./route";

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

  it("400 when registering without an OTP", async () => {
    expect((await POST(jsonPost("/api/auth/send-otp", { email: "a@b.co", type: "register" }))).status).toBe(400);
  });

  it("answers success for a reset of an unknown address (no enumeration)", async () => {
    const res = await POST(jsonPost("/api/auth/send-otp", { email: "ghost@example.com", type: "reset" }));
    expect(res.status).toBe(200);
  });
});
