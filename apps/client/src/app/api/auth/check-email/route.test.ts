import { describe, expect, it, vi } from "vitest";
import { jsonPost } from "../../_test/helpers";

vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ success: true }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/supabase/users", () => ({ findUserByEmail: async () => null }));

import { POST } from "./route";

describe("POST /api/auth/check-email validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/auth/check-email", "{nope"))).status).toBe(400);
  });

  it("400 when email is missing, not a string, or not an address", async () => {
    for (const body of [{}, { email: 42 }, { email: "not-an-email" }]) {
      expect((await POST(jsonPost("/api/auth/check-email", body))).status).toBe(400);
    }
  });

  it("answers { exists: false } for a valid unknown address", async () => {
    const res = await POST(jsonPost("/api/auth/check-email", { email: "new@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: false });
  });
});
