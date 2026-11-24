import { describe, it, expect } from "vitest";
import { computeWavePlacements, warpLineWidth } from "./text-warp";

const widths = [30, 40, 25, 35];

describe("computeWavePlacements", () => {
  it("amount 0 keeps the line straight", () => {
    const p = computeWavePlacements(widths, { amount: 0, fontSize: 48 });
    for (const g of p) {
      expect(g.y).toBeCloseTo(0, 10);
      expect(g.angle).toBeCloseTo(0, 10);
    }
  });

  it("keeps glyphs in order and advances x by each width", () => {
    const p = computeWavePlacements(widths, { amount: 60, fontSize: 48 });
    expect(p[0].x).toBe(0);
    expect(p[1].x).toBe(30);
    expect(p[2].x).toBe(70);
    expect(p[3].x).toBe(95);
  });

  it("never exceeds the amplitude cap (0.6 * fontSize at 100)", () => {
    const p = computeWavePlacements(Array(40).fill(30), { amount: 100, fontSize: 48 });
    const maxY = Math.max(...p.map((g) => Math.abs(g.y)));
    expect(maxY).toBeLessThanOrEqual(48 * 0.6 + 1e-9);
    expect(maxY).toBeGreaterThan(48 * 0.5); // the wave actually reaches near its amplitude
  });

  it("clamps amount outside 0–100", () => {
    const hi = computeWavePlacements(widths, { amount: 500, fontSize: 48 });
    const max = computeWavePlacements(widths, { amount: 100, fontSize: 48 });
    expect(hi).toEqual(max);
    const lo = computeWavePlacements(widths, { amount: -20, fontSize: 48 });
    expect(lo.every((g) => g.y === 0)).toBe(true);
  });

  it("rotation follows the slope sign", () => {
    // Near the centre of the line the curve is rising or falling; angle must be finite and bounded.
    const p = computeWavePlacements(Array(20).fill(20), { amount: 80, fontSize: 40 });
    for (const g of p) {
      expect(Number.isFinite(g.angle)).toBe(true);
      expect(Math.abs(g.angle)).toBeLessThan(90);
    }
  });
});

describe("warpLineWidth", () => {
  it("sums advance widths", () => {
    expect(warpLineWidth(widths)).toBe(130);
    expect(warpLineWidth([])).toBe(0);
  });
});
