import { describe, expect, it } from "vitest";
import { lineTotalCents, quantityDiscount } from "./order-pricing";

describe("quantityDiscount", () => {
  it.each([
    [1, 0],
    [9, 0],
    [10, 0.05],
    [49, 0.05],
    [50, 0.12],
    [99, 0.12],
    [100, 0.15],
  ])("quantity %i gets %f", (quantity, expected) => {
    expect(quantityDiscount(quantity)).toBe(expected);
  });
});

describe("lineTotalCents", () => {
  it("applies the tier discount to base price times quantity", () => {
    expect(lineTotalCents(40000, 10)).toBeCloseTo(40000 * 10 * 0.95);
  });

  it("returns the full price below the first tier", () => {
    expect(lineTotalCents(40000, 2)).toBe(80000);
  });
});
