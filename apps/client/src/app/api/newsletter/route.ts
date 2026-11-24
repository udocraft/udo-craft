import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";

// SERVICE ROLE JUSTIFICATION: anonymous visitors subscribe from the footer.
// The table has no public insert policy; this route is the only writer.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parse(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return null;
  const locale = typeof b.locale === "string" ? b.locale.slice(0, 8) : undefined;
  const website = typeof b.website === "string" ? b.website : ""; // honeypot
  return { email, locale, website };
}

export async function POST(request: NextRequest) {
  const { success } = await rateLimit(request, { scope: "newsletter", limit: 5, window: 60 });
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const data = parse(await request.json().catch(() => null));
  if (!data) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (data.website) return NextResponse.json({ ok: true });

  const { error } = await createServiceClient()
    .from("newsletter_subscribers")
    .upsert(
      { email: data.email, locale: data.locale ?? null, source: "footer" },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    console.error("newsletter insert failed", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
