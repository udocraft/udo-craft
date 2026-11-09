import { describe, expect, it, vi } from "vitest";
import { jsonPost, signedInUser } from "../../_test/helpers";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedInUser } }) } }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ rpc, from: () => ({}) }),
}));

import { POST } from "./route";

const png = "data:image/png;base64,AAAA";

describe("POST /api/ai/generate validation", () => {
  it("400 on malformed JSON", async () => {
    expect((await POST(jsonPost("/api/ai/generate", "{nope"))).status).toBe(400);
  });

  it("400 when prompt or image are missing / not a data URL", async () => {
    for (const body of [{}, { prompt: "cat" }, { prompt: "cat", imageDataUrl: "https://evil.test/x.png" }]) {
      expect((await POST(jsonPost("/api/ai/generate", body))).status).toBe(400);
    }
  });

  it("400 for an unknown mode", async () => {
    const res = await POST(jsonPost("/api/ai/generate", { prompt: "cat", imageDataUrl: png, mode: "root" }));
    expect(res.status).toBe(400);
  });

  it("does not touch the AI quota for a rejected body", async () => {
    await POST(jsonPost("/api/ai/generate", { prompt: 7 }));
    expect(rpc).not.toHaveBeenCalled();
  });
});
