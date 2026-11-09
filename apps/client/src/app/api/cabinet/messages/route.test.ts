import { describe, expect, it, vi } from "vitest";
import { jsonPost, signedInUser } from "../../_test/helpers";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedInUser }, error: null }) } }),
}));

import { POST } from "./route";

const leadId = "7d7f2b0e-95e7-4a3c-8c6f-0c1a3f1a9d11";

describe("POST /api/cabinet/messages validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/cabinet/messages", "{nope"))).status).toBe(400);
  });

  it("400 when lead_id is not a uuid", async () => {
    expect((await POST(jsonPost("/api/cabinet/messages", { lead_id: "1; drop table", body: "hi" }))).status).toBe(400);
  });

  it("400 when there is neither text nor attachments", async () => {
    expect((await POST(jsonPost("/api/cabinet/messages", { lead_id: leadId, body: "   " }))).status).toBe(400);
  });

  it("400 when attachments is not a list of strings", async () => {
    expect((await POST(jsonPost("/api/cabinet/messages", { lead_id: leadId, attachments: [1, 2] }))).status).toBe(400);
  });
});
