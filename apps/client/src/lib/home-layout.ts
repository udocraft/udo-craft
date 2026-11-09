/**
 * Home page layout resolution.
 *
 * The home page has 9 sections (Plan.md §3.2). `cms_published.home_layout`
 * was authored against the old 16 section ids, so every old id maps to the
 * section it was merged into. A merged section renders once, at the position
 * of its first visible source id. It is hidden only when every id that maps
 * to it is `visible: "false"`. Unknown ids are ignored.
 */
export const HOME_SECTION_IDS = [
  "hero",
  "proof",
  "collections",
  "demo",
  "process",
  "services",
  "why",
  "faq",
  "contact",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const DEFAULT_HOME_LAYOUT: readonly HomeSectionId[] = HOME_SECTION_IDS;

/** Old (16-section) id -> new section. New ids map to themselves. */
const ID_MAP: Record<string, HomeSectionId> = {
  hero: "hero",
  social: "proof",
  proof: "proof",
  collections: "collections",
  customizer: "demo",
  designer: "demo",
  demo: "demo",
  process: "process",
  box: "services",
  popup: "services",
  subscription: "services",
  services: "services",
  problems: "why",
  comparison: "why",
  stats: "why",
  trust: "why",
  why: "why",
  faq: "faq",
  cta: "contact",
  contact: "contact",
};

function isHidden(visible: unknown): boolean {
  return visible === false || visible === "false";
}

export function resolveHomeLayout(raw: unknown): HomeSectionId[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_HOME_LAYOUT];

  const placed: HomeSectionId[] = [];
  let recognised = false;

  for (const entry of raw) {
    const id = entry && typeof entry === "object" ? (entry as { id?: unknown }).id : undefined;
    const target = typeof id === "string" ? ID_MAP[id.trim().toLowerCase()] : undefined;
    if (!target) continue;
    recognised = true;
    if (isHidden((entry as { visible?: unknown }).visible)) continue;
    if (!placed.includes(target)) placed.push(target);
  }

  return recognised ? placed : [...DEFAULT_HOME_LAYOUT];
}
