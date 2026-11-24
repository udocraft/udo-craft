/**
 * Pure layout math for warped text (wave). No Fabric dependency, so it is unit-testable.
 *
 * Each glyph (or word-free character) keeps its advance width, and is placed on a
 * sine curve. `amount` is 0–100: 0 = straight line, 100 = maximum wave.
 */

export interface WarpPlacement {
  /** x of the glyph's left edge, relative to the line's left edge (0 = start of line) */
  x: number;
  /** vertical offset, px; positive = down */
  y: number;
  /** glyph rotation in degrees, follows the curve's slope */
  angle: number;
}

export interface WaveOptions {
  /** 0–100 */
  amount: number;
  fontSize: number;
}

/**
 * @param widths advance width of each character, px
 */
export function computeWavePlacements(widths: number[], { amount, fontSize }: WaveOptions): WarpPlacement[] {
  const clamped = Math.min(100, Math.max(0, amount));
  const amplitude = (clamped / 100) * fontSize * 0.6;
  const wavelength = fontSize * 5;
  const k = (2 * Math.PI) / wavelength;

  const total = widths.reduce((sum, w) => sum + w, 0);
  let cursor = 0;
  return widths.map((w) => {
    // Sample the curve at the glyph centre so rotation reads naturally.
    const centre = cursor + w / 2 - total / 2;
    const y = amplitude * Math.sin(k * centre);
    const slope = amplitude * k * Math.cos(k * centre);
    const placement: WarpPlacement = {
      x: cursor,
      y,
      angle: (Math.atan(slope) * 180) / Math.PI,
    };
    cursor += w;
    return placement;
  });
}

/** Total advance width of a laid-out line, px. */
export function warpLineWidth(widths: number[]): number {
  return widths.reduce((sum, w) => sum + w, 0);
}
