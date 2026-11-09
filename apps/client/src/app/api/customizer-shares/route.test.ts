import { describe, expect, it, vi } from "vitest";
import { jsonPost, signedInUser } from "../_test/helpers";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedInUser } }) } }),
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));

import { POST } from "./route";

describe("POST /api/customizer-shares validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/customizer-shares", "{nope"))).status).toBe(400);
  });

  it("400 when productId or payload are missing or the wrong type", async () => {
    for (const body of [{}, { productId: "p1" }, { productId: "p1", payload: "layers" }, { productId: 5, payload: {} }]) {
      expect((await POST(jsonPost("/api/customizer-shares", body))).status).toBe(400);
    }
  });

  it("400 for an unknown access level", async () => {
    const res = await POST(jsonPost("/api/customizer-shares", { productId: "p1", payload: {}, access: "owner" }));
    expect(res.status).toBe(400);
  });
});
