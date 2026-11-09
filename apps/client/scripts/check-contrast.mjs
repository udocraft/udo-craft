#!/usr/bin/env node
/**
 * Token contrast check (Plan.md Phase 5). Reads the colour tokens from
 * src/app/globals.css (`@theme static` = light scope, `.inverse` = dark
 * sections) and verifies WCAG 2.2 contrast for every text/background pair:
 * text >= 4.5:1 (fails the script), UI components (focus ring, input border)
 * >= 3:1 (reported as WARN: a token change is a design decision).
 *
 *   npm run test:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "../src/app/globals.css"), "utf8");

/** Body of the first `{...}` block that follows `marker`. */
function block(marker) {
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`globals.css: "${marker}" not found`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`globals.css: unbalanced braces after "${marker}"`);
}

function parseTokens(body) {
  const tokens = {};
  for (const m of body.matchAll(/--(color-[\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}

const light = parseTokens(block("@theme static"));
const inverse = { ...light, ...parseTokens(block(".inverse,")) };

function resolve(tokens, name, seen = new Set()) {
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`unknown token --${name}`);
  const ref = raw.match(/^var\(--([\w-]+)\)$/);
  if (!ref) return raw;
  if (seen.has(name)) throw new Error(`token cycle at --${name}`);
  seen.add(name);
  return resolve(tokens, ref[1], seen);
}

/** oklch(L C h) -> linear sRGB, gamut-clipped. L may be 0..1 or a percentage. */
function oklchToLinear(value) {
  const m = value.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.]+%?)?\)$/);
  if (!m) throw new Error(`unsupported colour: ${value}`);
  const L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const h = (parseFloat(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (x) => Math.min(1, Math.max(0, x));
  return [
    clip(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
    clip(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
    clip(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
  ];
}

function luminance(value) {
  const [r, g, b] = oklchToLinear(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground token, background token, minimum ratio, what it is]. */
const TEXT = 4.5;
const UI = 3;
const PAIRS = [
  ["foreground", "background", TEXT, "body text"],
  ["foreground", "muted", TEXT, "text on muted surface"],
  ["foreground", "secondary", TEXT, "text on secondary surface"],
  ["card-foreground", "card", TEXT, "card text"],
  ["popover-foreground", "popover", TEXT, "popover text"],
  ["primary-foreground", "primary", TEXT, "primary button"],
  ["primary-foreground", "primary-hover", TEXT, "primary button hover"],
  ["secondary-foreground", "secondary", TEXT, "secondary button"],
  ["accent-foreground", "accent", TEXT, "accent surface"],
  ["muted-foreground", "background", TEXT, "secondary text on page"],
  ["muted-foreground", "muted", TEXT, "secondary text on muted"],
  ["muted-foreground", "card", TEXT, "secondary text on card"],
  ["brand", "background", TEXT, "brand-coloured text"],
  ["brand", "card", TEXT, "brand-coloured text on card"],
  ["primary", "background", TEXT, "primary-coloured text"],
  ["success-foreground", "success", TEXT, "success badge"],
  ["info-foreground", "info", TEXT, "info badge"],
  ["warning-foreground", "warning", TEXT, "warning badge"],
  ["primary-foreground", "destructive", TEXT, "destructive button (white text)"],
  ["ring", "background", UI, "focus ring (1.4.11)"],
  ["input", "background", UI, "input border (1.4.11)"],
];

/** Pairs that do not apply in a scope (token not remapped and not used there). */
// Inside .inverse, brand-coloured text uses --color-brand (lightened), not --color-primary.
const SKIP = { inverse: new Set(["primary-foreground|primary-hover", "primary-foreground|destructive", "success-foreground|success", "info-foreground|info", "warning-foreground|warning", "primary|background"]) };

let failures = 0;
let warnings = 0;
const rows = [];
for (const [scope, tokens] of [["light", light], ["inverse", inverse]]) {
  for (const [fg, bg, min, what] of PAIRS) {
    if (SKIP[scope]?.has(`${fg}|${bg}`)) continue;
    // primary-foreground is white on the saturated primary in both scopes; check it only on its own scope tokens.
    const ratio = contrast(resolve(tokens, `color-${fg}`), resolve(tokens, `color-${bg}`));
    const ok = ratio >= min;
    const blocking = min === TEXT;
    if (!ok && blocking) failures++;
    if (!ok && !blocking) warnings++;
    rows.push({ scope, pair: `${fg} on ${bg}`, what, ratio: ratio.toFixed(2), min, ok, blocking });
  }
}

const width = Math.max(...rows.map((r) => r.pair.length));
for (const r of rows) {
  console.log(`${r.ok ? "PASS" : r.blocking ? "FAIL" : "WARN"}  ${r.scope.padEnd(7)} ${r.pair.padEnd(width)}  ${r.ratio.padStart(6)}  (>= ${r.min})  ${r.what}`);
}
console.log(`\n${rows.length - failures - warnings}/${rows.length} pairs pass, ${failures} fail, ${warnings} warn`);
process.exit(failures ? 1 : 0);
