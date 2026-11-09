/**
 * The only place hex colours may live in client code (Plan.md §2.2: "Canvas
 * colours are data, not tokens"). They describe garments, ink and canvas
 * handles, not UI chrome, so they must not follow the theme.
 * For UI chrome use the tokens in globals.css.
 */

// Ink and canvas defaults
export const INK_BLACK = "#000000";
export const INK_WHITE = "#ffffff";
/** Fabric.js control handle fill. */
export const CANVAS_HANDLE_FILL = INK_WHITE;
/** Used when a CSS token cannot be read (SSR, detached canvas). */
export const BRAND_FALLBACK = "#1B3BFF";
export const DESTRUCTIVE_FALLBACK = "#ef4444";
/** Light squares of the transparency checkerboard behind print previews. */
export const CHECKER_LIGHT = "#e5e7eb";

/** Print colour swatches in the text/shape toolbar. */
export const PRINT_SWATCHES = [
  INK_BLACK, INK_WHITE, "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#06b6d4", BRAND_FALLBACK, "#6b7280",
] as const;

/** Confetti on the order-success dialog. */
export const CONFETTI_COLORS = [BRAND_FALLBACK, INK_WHITE, "#22c55e", "#f97316"];

// Garment swatches
const LIGHT_GARMENT_HEXES = ["#ffffff", "#f5f5f5", "#f0f0f0"];
/** True for near-white garment colours, which need a visible border or a dark tick. */
export const isLightSwatch = (hex: string) => LIGHT_GARMENT_HEXES.includes(hex.toLowerCase());
/** Shown when a garment colour has no hex code. */
export const NEUTRAL_SWATCH = "#cccccc";
/** Check-mark colours on a selected garment swatch. */
export const TICK_ON_LIGHT = "#1a1a1a";
export const TICK_ON_DARK = INK_WHITE;

/** Placeholder swatches for products that have no colour variants yet. */
export const FALLBACK_GARMENT_COLORS = [
  { name: "Black", hex: "#1a1a1a", border: false },
  { name: "White", hex: "#f0f0f0", border: true },
  { name: "Gray", hex: "#9ca3af", border: false },
  { name: "Navy", hex: "#1e3a5f", border: false },
  { name: "Blue", hex: "#2563eb", border: false },
  { name: "Red", hex: "#dc2626", border: false },
] as const;

// Drawing studio
export const DRAWING_PRESET_COLORS: { hex: string; label: string }[] = [
  { hex: "#ffffff", label: "Білий" },
  { hex: "#ff453a", label: "Червоний" },
  { hex: "#ff9f0a", label: "Помаранчевий" },
  { hex: "#ffd60a", label: "Жовтий" },
  { hex: "#30d158", label: "Зелений" },
  { hex: "#64d2ff", label: "Блакитний" },
  { hex: "#0a84ff", label: "Синій" },
  { hex: "#bf5af2", label: "Фіолетовий" },
  { hex: "#ff2d55", label: "Рожевий" },
  { hex: INK_BLACK, label: "Чорний" },
];
export const DRAWING_DEFAULT_COLOR = "#ffd60a";
/** Eraser tip in the tool-preview illustration. */
export const ERASER_TIP_PINK = "#f1a1ad";

/** Social share image (opengraph-image). Satori cannot read oklch tokens, so these are the brand values as hex. */
export const OG_BACKGROUND = "#0d1020";
export const OG_FOREGROUND = "#fafaff";
export const OG_MUTED = "#b4b8d0";
export const OG_ACCENT = "#6d7bff";

/** Drawing-studio tool illustrations (physical materials, not UI chrome). */
export const TOOL_ART = {
  bodyDark: "#2b2d33",
  bodyDarkEdge: "#17181c",
  bodyLight: "#f4f4f6",
  bodyLightEdge: "#c9cbd3",
  metal: "#b9bdc7",
  metalEdge: "#8b909c",
  wood: "#e7c391",
  woodEdge: "#c79a5d",
  glass: "#eef2ff",
  eraser: ERASER_TIP_PINK,
  eraserEdge: "#d97f8e",
  highlight: "#ffffff",
} as const;
