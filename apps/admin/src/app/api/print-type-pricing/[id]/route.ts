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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await auth();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  // Only editable columns; id, print_type and timestamps are never taken from the client.
  const ALLOWED = ["size_label", "size_min_cm", "size_max_cm", "qty_tiers", "sort_order", "is_active"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED) if (body?.[key] !== undefined) patch[key] = body[key];
  const { data, error: dbErr } = await svc()
    .from("print_type_pricing")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (dbErr?.code === "23505") return NextResponse.json({ error: "Такий розмір уже є для цього типу" }, { status: 409 });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await auth();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error: dbErr } = await svc().from("print_type_pricing").delete().eq("id", params.id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
