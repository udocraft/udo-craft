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

  const productId = new URL(request.url).searchParams.get("product_id");
  let query = svc().from("print_zones").select("*");
  if (productId) query = query.eq("product_id", productId);

  const { data, error: dbErr } = await query.order("created_at", { ascending: true });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { user, error } = await auth();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { product_id, side = "front", x, y, width, height, allowed_print_types, label, sort_order, width_mm, height_mm, print_area_id } = body;
  if (!product_id) return NextResponse.json({ error: "product_id required" }, { status: 400 });
  if (typeof side !== "string" || !/^[a-z][a-z0-9_]{0,31}$/.test(side)) {
    return NextResponse.json({ error: "invalid side" }, { status: 400 });
  }
  const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

  // Upsert: delete existing zone for this product+side, then insert
  await svc().from("print_zones").delete().eq("product_id", product_id).eq("side", side);

  const { data, error: dbErr } = await svc()
    .from("print_zones")
    .insert({
      product_id, side,
      x: Math.round(Number(x ?? 100)), y: Math.round(Number(y ?? 100)),
      width: Math.max(1, Math.round(Number(width ?? 200))), height: Math.max(1, Math.round(Number(height ?? 250))),
      label: typeof label === "string" && label.trim() ? label.trim() : null,
      sort_order: Math.round(num(sort_order) ?? 0),
      width_mm: num(width_mm),
      height_mm: num(height_mm),
      print_area_id: print_area_id || null,
      allowed_print_types: allowed_print_types ?? ["dtf"],
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await auth();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  const { error: dbErr } = await svc().from("print_zones").delete().eq("id", id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
