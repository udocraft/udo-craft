import { describe, expect, it } from "vitest";
import { validateFile } from "./validate-file";

const fileOf = (type: string, size = 1024) =>
  new File([new Uint8Array(size)], "upload", { type });

describe("validateFile", () => {
  it.each(["image/png", "image/jpeg", "application/pdf"])("accepts %s", (type) => {
    expect(validateFile(fileOf(type)).valid).toBe(true);
  });

  it("rejects SVG, which can carry script", () => {
    expect(validateFile(fileOf("image/svg+xml")).valid).toBe(false);
  });

  it("rejects files over 10 MB", () => {
    expect(validateFile(fileOf("image/png", 11 * 1024 * 1024)).valid).toBe(false);
  });
});
