import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./redirect";

describe("safeReturnPath", () => {
  it("keeps same-site paths", () => {
    expect(safeReturnPath("/cabinet/orders?id=1")).toBe("/cabinet/orders?id=1");
    expect(safeReturnPath("/uk/order")).toBe("/uk/order");
  });
  it("rejects external and malformed targets", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined]) {
      expect(safeReturnPath(bad)).toBe("/cabinet");
    }
  });
});
