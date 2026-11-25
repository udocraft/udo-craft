import { describe, expect, it } from "vitest";
import { ilikeExact } from "./email-match";

describe("ilikeExact", () => {
  it("lower-cases and escapes LIKE wildcards", () => {
    expect(ilikeExact(" Ira_B%@Mail.com ")).toBe("ira\\_b\\%@mail.com");
    expect(ilikeExact("a\\b@x.com")).toBe("a\\\\b@x.com");
  });
});
