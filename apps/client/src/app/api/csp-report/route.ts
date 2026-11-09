import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { CSP_REPORT_MAX_BYTES, parseCspReports } from "@/lib/csp-report";

export const runtime = "nodejs";

const ACCEPTED = ["application/csp-report", "application/reports+json", "application/json"];

/** Read the body but stop once the cap is exceeded. Returns null when too large. */
async function readCapped(req: NextRequest): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > CSP_REPORT_MAX_BYTES) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > CSP_REPORT_MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(req: NextRequest) {
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ACCEPTED.includes(type)) return new NextResponse(null, { status: 415 });

  const raw = await readCapped(req);
  if (raw === null) return new NextResponse(null, { status: 413 });

  for (const v of parseCspReports(raw)) {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureMessage(`CSP ${v.directive} blocked ${v.blocked || "(inline)"}`, {
        level: "warning",
        tags: { kind: "csp-violation", directive: v.directive },
        extra: { ...v },
        fingerprint: ["csp-violation", v.directive, v.blocked],
      });
    } else {
      console.warn("[csp-report]", JSON.stringify(v));
    }
  }
  return new NextResponse(null, { status: 204 });
}
