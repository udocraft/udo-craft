import { describe, expect, it } from "vitest";
import {
  canTransitionLead,
  discountPctForQty,
  printLayerUnitCents,
  priceOrderLine,
  type PrintPricingRow,
} from "@udo-craft/shared";

// Pricing and status rules live in packages/shared/src/orders.ts and are used by
// the storefront, the public order API and the admin. These tests pin them down.

describe("discountPctForQty", () => {
  it.each([
    [1, 0],
    [9, 0],
    [10, 5],
    [49, 5],
    [50, 12],
    [99, 12],
    [100, 15],
  ])("default grid: quantity %i gets %i%%", (quantity, expected) => {
    expect(discountPctForQty([], quantity)).toBe(expected);
  });

  it("uses the product's own grid when present", () => {
    const grid = [{ qty: 10, discount_pct: 5 }, { qty: 50, discount_pct: 10 }];
    expect(discountPctForQty(grid, 50)).toBe(10);
    expect(discountPctForQty(grid, 9)).toBe(0);
  });

  it("ignores malformed grid rows", () => {
    expect(discountPctForQty([{ qty: "x", discount_pct: 50 }], 100)).toBe(15);
  });
});

const pricing: PrintPricingRow[] = [
  { print_type: "dtf", size_label: "A4", qty_tiers: [{ min_qty: 1, price_cents: 15000 }, { min_qty: 50, price_cents: 9000 }] },
];

describe("printLayerUnitCents", () => {
  it("picks the tier for the quantity", () => {
    expect(printLayerUnitCents({ type: "dtf", sizeLabel: "A4" }, 10, pricing)).toBe(15000);
    expect(printLayerUnitCents({ type: "dtf", sizeLabel: "A4" }, 60, pricing)).toBe(9000);
  });

  it("charges nothing for combo children, unknown sizes or missing size", () => {
    expect(printLayerUnitCents({ type: "dtf", sizeLabel: "A4", isComboChild: true }, 10, pricing)).toBe(0);
    expect(printLayerUnitCents({ type: "dtf", sizeLabel: "A3" }, 10, pricing)).toBe(0);
    expect(printLayerUnitCents({ type: "dtf" }, 10, pricing)).toBe(0);
  });
});

describe("priceOrderLine", () => {
  it("includes print cost in the line total", () => {
    const line = priceOrderLine({
      basePriceCents: 40000,
      quantity: 10,
      layers: [{ type: "dtf", sizeLabel: "A4" }],
      printPricing: pricing,
    });
    expect(line).toEqual({ unitPriceCents: 38000, printCostCents: 15000, discountPct: 5, lineTotalCents: 530000 });
  });

  it("returns whole cents", () => {
    const line = priceOrderLine({ basePriceCents: 33333, quantity: 10 });
    expect(Number.isInteger(line.unitPriceCents)).toBe(true);
    expect(Number.isInteger(line.lineTotalCents)).toBe(true);
  });
});

describe("canTransitionLead", () => {
  it("allows the normal flow and corrections", () => {
    expect(canTransitionLead("new", "in_progress")).toBe(true);
    expect(canTransitionLead("production", "in_progress")).toBe(true);
    expect(canTransitionLead("archived", "new")).toBe(true);
  });

  it("blocks moves back to draft and out of archive to completed", () => {
    expect(canTransitionLead("new", "draft")).toBe(false);
    expect(canTransitionLead("archived", "completed")).toBe(false);
    expect(canTransitionLead("new", "bogus")).toBe(false);
  });
});
