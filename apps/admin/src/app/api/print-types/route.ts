import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validatePrintType } from "./_shared";

// GET /api/print-types — all types (active and hidden), with how many price rows each has.
export async function GET() {
  const svc = createServiceClient();
  const [types, pricing] = await Promise.all([
    svc.from("print_types").select("*").order("sort_order").order("label"),
    svc.from("print_type_pricing").select("print_type"),
  ]);
  if (types.error) return NextResponse.json({ error: types.error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of pricing.data ?? []) counts[row.print_type] = (counts[row.print_type] ?? 0) + 1;
  return NextResponse.json((types.data ?? []).map((t) => ({ ...t, price_count: counts[t.id] ?? 0 })));
}

// POST /api/print-types — create.
export async function POST(request: NextRequest) {
  const parsed = validatePrintType(await request.json().catch(() => null), true);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await createServiceClient().from("print_types").insert(parsed.data).select().single();
  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "Тип з таким кодом вже існує" : error.message }, { status });
  }
  return NextResponse.json({ ...data, price_count: 0 }, { status: 201 });
}
