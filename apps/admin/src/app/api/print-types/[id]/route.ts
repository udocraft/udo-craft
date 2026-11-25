import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validatePrintType } from "../_shared";

// PATCH /api/print-types/:id — edit label, description, colour, visibility, order.
// The code (id) is not editable: it is stored in saved orders and print zones.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = validatePrintType(await request.json().catch(() => null), false);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id: _ignored, ...patch } = parsed.data;
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Немає змін" }, { status: 400 });

  const { data, error } = await createServiceClient()
    .from("print_types").update(patch).eq("id", params.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Тип не знайдено" }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE /api/print-types/:id — only when no prices use it; otherwise hide it instead.
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const svc = createServiceClient();
  const { count } = await svc
    .from("print_type_pricing").select("id", { count: "exact", head: true }).eq("print_type", params.id);
  if (count && count > 0) {
    return NextResponse.json(
      { error: `Тип має ${count} цін. Видаліть ціни або приховайте тип.` },
      { status: 409 },
    );
  }
  const { error } = await svc.from("print_types").delete().eq("id", params.id);
  if (error) {
    const status = error.code === "23503" ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "Тип ще використовується" : error.message }, { status });
  }
  return NextResponse.json({ ok: true });
}
