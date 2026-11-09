import { describe, expect, it, vi } from "vitest";
import { formPost, jsonPost } from "../_test/helpers";

vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => ({ success: true }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));

import { POST } from "./route";

describe("POST /api/upload validation", () => {
  it("400 when the body is not multipart", async () => {
    expect((await POST(jsonPost("/api/upload", { files: "x" }))).status).toBe(400);
  });

  it("400 when `files` carries text instead of a file", async () => {
    const form = new FormData();
    form.append("files", "not-a-file");
    expect((await POST(formPost("/api/upload", form))).status).toBe(400);
  });

  it("400 for a disallowed MIME type and for more than 10 files", async () => {
    const exe = new FormData();
    exe.append("files", new File(["x"], "a.exe", { type: "application/x-msdownload" }));
    expect((await POST(formPost("/api/upload", exe))).status).toBe(400);

    const many = new FormData();
    for (let i = 0; i < 11; i++) many.append("files", new File(["x"], `a${i}.png`, { type: "image/png" }));
    expect((await POST(formPost("/api/upload", many))).status).toBe(400);
  });

  it("returns an empty list when no files are sent", async () => {
    const res = await POST(formPost("/api/upload", new FormData()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ urls: [] });
  });
});
