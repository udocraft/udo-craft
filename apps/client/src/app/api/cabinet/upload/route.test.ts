import { describe, expect, it, vi } from "vitest";
import { formPost, jsonPost, signedInUser } from "../../_test/helpers";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: signedInUser }, error: null }) } }),
}));

import { POST } from "./route";

describe("POST /api/cabinet/upload validation", () => {
  it("400 when the body is not multipart", async () => {
    expect((await POST(jsonPost("/api/cabinet/upload", {}))).status).toBe(400);
  });

  it("400 when `files` carries text instead of a file", async () => {
    const form = new FormData();
    form.append("files", "not-a-file");
    expect((await POST(formPost("/api/cabinet/upload", form))).status).toBe(400);
  });

  it("400 for a disallowed MIME type", async () => {
    const form = new FormData();
    form.append("files", new File(["x"], "a.html", { type: "text/html" }));
    expect((await POST(formPost("/api/cabinet/upload", form))).status).toBe(400);
  });
});
