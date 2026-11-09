import sanitizeHtml from "sanitize-html";

/**
 * Allowlist sanitiser for CMS-authored HTML (privacy, terms).
 * Anything outside the allowlist is dropped: script/style bodies are removed,
 * other unknown tags are unwrapped, all attributes except a[href] are stripped,
 * and href is limited to http, https and mailto.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["h2", "h3", "h4", "p", "ul", "ol", "li", "a", "strong", "em", "br"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

export function sanitizeCmsHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
