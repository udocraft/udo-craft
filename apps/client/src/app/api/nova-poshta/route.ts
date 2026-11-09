import { NextRequest, NextResponse } from "next/server";
import { mapNpResponse, npRequestBody, parseNpQuery } from "@/lib/nova-poshta";

// Proxy for the checkout's city / branch search. Server-side so the browser only talks to
// our origin (CSP connect-src) and the optional API key stays private. The public address
// methods work without a key; set NOVA_POSHTA_API_KEY for higher limits.
export async function GET(request: NextRequest) {
  const query = parseNpQuery(request.nextUrl.searchParams);
  if (!query) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  try {
    const res = await fetch("https://api.novaposhta.ua/v2.0/json/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(npRequestBody(query, process.env.NOVA_POSHTA_API_KEY ?? "")),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Nova Poshta ${res.status}`);
    return NextResponse.json(
      { options: mapNpResponse(query, await res.json()) },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  } catch (err) {
    console.error("[nova-poshta]", err);
    // The form falls back to a free-text field on any non-200.
    return NextResponse.json({ error: "Lookup unavailable" }, { status: 502 });
  }
}
