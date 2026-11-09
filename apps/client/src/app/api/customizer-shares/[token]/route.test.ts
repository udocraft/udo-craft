import { describe, expect, it, vi } from "vitest";
import { jsonRequest, queryStub, signedInUser } from "../../_test/helpers";

const share = { id: "s1", created_by: signedInUser.id, access: "edit", is_active: true, expires_at: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedInUser } }) } }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: () => queryStub({ data: share, error: null }) }),
}));

import { PATCH, POST } from "./route";

const ctx = { params: { token: "tok" } };

describe("PATCH /api/customizer-shares/[token] validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await PATCH(jsonRequest("PATCH", "/api/customizer-shares/tok", "{nope"), ctx)).status).toBe(400);
  });

  it("400 when neither payload nor a valid access is sent", async () => {
    for (const body of [{}, { access: "owner" }, { payload: "text" }]) {
      expect((await PATCH(jsonRequest("PATCH", "/api/customizer-shares/tok", body), ctx)).status).toBe(400);
    }
  });
});

describe("POST /api/customizer-shares/[token] (comment) validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonRequest("POST", "/api/customizer-shares/tok", "{nope"), ctx)).status).toBe(400);
  });

  it("400 for an empty, blank or non-string comment", async () => {
    for (const body of [{}, { body: "   " }, { body: 12 }]) {
      expect((await POST(jsonRequest("POST", "/api/customizer-shares/tok", body), ctx)).status).toBe(400);
    }
  });
});
