import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Public list of print types the customizer may offer (active only by default).
// Same service-role pattern as /api/print-type-pricing; the table is also
// readable with the anon key under RLS.
// ?all=1 also returns hidden types (for labels on older orders, e.g. invoices).
export async function GET(request: NextRequest) {
  const all = new URL(request.url).searchParams.get("all") === "1";
  let query = createServiceClient()
    .from("print_types")
    .select("id,label,description,color,sort_order");
  if (!all) query = query.eq("is_active", true);
  const { data, error } = await query.order("sort_order").order("label");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map((t) => ({ id: t.id, label: t.label, color: t.color, desc: t.description })),
  );
}
