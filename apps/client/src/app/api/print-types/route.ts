import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Public list of print types the customizer may offer (active only).
// Same service-role pattern as /api/print-type-pricing; the table is also
// readable with the anon key under RLS.
export const revalidate = 60;

export async function GET() {
  const { data, error } = await createServiceClient()
    .from("print_types")
    .select("id,label,description,color,sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("label");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map((t) => ({ id: t.id, label: t.label, color: t.color, desc: t.description })),
  );
}
