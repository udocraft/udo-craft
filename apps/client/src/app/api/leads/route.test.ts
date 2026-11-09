import { describe, expect, it, vi } from "vitest";
import { jsonPost } from "../_test/helpers";

vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ success: true }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));
vi.mock("@/lib/supabase/env", () => ({
  getSupabaseServiceEnv: () => ({ serviceRoleKey: "service" }),
  getSupabasePublicEnv: () => ({ url: "http://localhost", anonKey: "anon" }),
}));
vi.mock("@/lib/email", () => ({
  sendOrderConfirmation: async () => undefined,
  sendContactNotification: async () => undefined,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({}) }));

import { POST } from "./route";

const validLead = {
  status: "new",
  customer_data: { name: "Ira", email: "ira@example.com", phone: "+380501112233" },
  total_amount_cents: 0,
};

describe("POST /api/leads validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/leads", "{nope"))).status).toBe(400);
  });

  it("400 when required customer fields are missing", async () => {
    const res = await POST(jsonPost("/api/leads", { ...validLead, customer_data: { name: "Ira" } }));
    expect(res.status).toBe(400);
  });

  it("400 on an invalid status and on a malformed order item", async () => {
    expect((await POST(jsonPost("/api/leads", { ...validLead, status: "hacked" }))).status).toBe(400);
    const badItem = { ...validLead, order_items: [{ product_id: "p1", quantity: "many", size: "M", color: "black" }] };
    expect((await POST(jsonPost("/api/leads", badItem))).status).toBe(400);
  });

  it("accepts a honeypot-filled but well-formed body without inserting", async () => {
    const body = { ...validLead, customer_data: { ...validLead.customer_data, website: "http://spam.test" } };
    const res = await POST(jsonPost("/api/leads", body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "bot-rejected" });
  });
});
