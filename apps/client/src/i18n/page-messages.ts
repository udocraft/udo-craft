export type Namespace = string;

const PAGE_NAMESPACES: Record<string, Namespace[]> = {
  "/": [
    "nav", "hero", "socialProof", "about", "problemSolution",
    "collections", "process", "boxOfTouch", "popupStand",
    "subscription", "designer", "customizer", "trust",
    "comparison", "faq", "finalCta", "contact", "footer",
    "howItWorks", "stats", "langSwitcher", "services",
  ],
  "/order": [
    "nav", "cart", "checkout", "footer", "langSwitcher",
    "customizer", "services",
  ],
  "/popup": [
    "nav", "popup", "footer", "langSwitcher", "hero",
  ],
  "/cabinet": [
    "nav", "cabinet", "footer", "langSwitcher",
  ],
  "/privacy": [
    "nav", "privacy", "footer", "langSwitcher",
  ],
  "/terms": [
    "nav", "terms", "footer", "langSwitcher",
  ],
};

const ALWAYS_INCLUDE: Namespace[] = ["nav", "langSwitcher"];

export function getPageNamespaces(pathname: string): Namespace[] {
  const namespaces = PAGE_NAMESPACES[pathname] || PAGE_NAMESPACES["/"];
  const set = new Set([...ALWAYS_INCLUDE, ...namespaces]);
  return Array.from(set);
}

export function filterMessages(
  messages: Record<string, unknown>,
  namespaces: Namespace[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const ns of namespaces) {
    if (messages[ns] !== undefined) {
      result[ns] = messages[ns];
    }
  }
  return result;
}
