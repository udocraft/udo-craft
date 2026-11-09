export const CSP_REPORT_MAX_BYTES = 16 * 1024;
const MAX_FIELD = 300;
const MAX_REPORTS = 10;

export interface CspViolation {
  directive: string;
  blocked: string;
  document: string;
  source: string;
  line: number | null;
  disposition: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_FIELD) : "");

function normalise(body: unknown): CspViolation | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  // Legacy report-uri uses kebab-case keys, Reporting API uses camelCase.
  const directive = str(b["effective-directive"] ?? b.effectiveDirective ?? b["violated-directive"] ?? b.violatedDirective);
  if (!directive) return null;
  const line = b["line-number"] ?? b.lineNumber;
  return {
    directive,
    blocked: str(b["blocked-uri"] ?? b.blockedURL ?? b.blockedUri),
    document: str(b["document-uri"] ?? b.documentURL ?? b.documentUri),
    source: str(b["source-file"] ?? b.sourceFile),
    line: typeof line === "number" ? line : null,
    disposition: str(b.disposition),
  };
}

/** Parse an `application/csp-report` or `application/reports+json` payload. Never throws. */
export function parseCspReports(raw: string): CspViolation[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const items = Array.isArray(json) ? json : [json];
  const out: CspViolation[] = [];
  for (const item of items.slice(0, MAX_REPORTS)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const v = rec["csp-report"]
      ? normalise(rec["csp-report"])
      : rec.type === "csp-violation"
        ? normalise(rec.body)
        : null;
    if (v) out.push(v);
  }
  return out;
}
