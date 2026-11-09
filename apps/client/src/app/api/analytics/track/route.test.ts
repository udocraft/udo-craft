import { describe, expect, it, vi } from "vitest";
import { jsonPost } from "../../_test/helpers";

const insert = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ success: true }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ from: () => ({ insert }) }) }));

import { POST } from "./route";

const event = { event_type: "pageview", visitor_id: "v1", session_id: "s1", page: "/uk", referrer: null, metadata: null };

describe("POST /api/analytics/track validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/analytics/track", "{nope"))).status).toBe(400);
  });

  it("400 for an unknown event type, missing ids, or ids over 100 chars", async () => {
    for (const body of [
      { ...event, event_type: "purchase" },
      { ...event, visitor_id: "" },
      { event_type: "pageview" },
      { ...event, session_id: "x".repeat(101) },
    ]) {
      expect((await POST(jsonPost("/api/analytics/track", body))).status).toBe(400);
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it("stores a well-formed event", async () => {
    const res = await POST(jsonPost("/api/analytics/track", event));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
