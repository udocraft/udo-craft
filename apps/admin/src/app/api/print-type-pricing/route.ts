import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function auth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function GET(request: NextRequest) {
  const { user, error } = await auth();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const printType = new URL(request.url).searchParams.get("print_type");
  let query = svc().from("print_type_pricing").select("*");
  if (printType) query = query.eq("print_type", printType);

  const { data, error: dbErr } = await query.order("print_type").order("sort_order");
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { user, error } = await auth();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { print_type, size_label, size_min_cm, size_max_cm, qty_tiers, sort_order } = body;
  if (!print_type || !size_label) return NextResponse.json({ error: "print_type and size_label required" }, { status: 400 });

  const { data, error: dbErr } = await svc()
    .from("print_type_pricing")
    .insert({ print_type, size_label, size_min_cm, size_max_cm, qty_tiers: qty_tiers ?? [], sort_order: sort_order ?? 0 })
    .select()
    .single();

  // Insert, not upsert: a duplicate size label must not silently overwrite existing prices.
  if (dbErr?.code === "23505") return NextResponse.json({ error: `Розмір «${size_label}» уже є для цього типу` }, { status: 409 });
  if (dbErr?.code === "23503") return NextResponse.json({ error: "Невідомий тип друку" }, { status: 400 });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
