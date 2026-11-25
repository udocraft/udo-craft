import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 500;

// POST /api/leads/bulk-delete { ids: string[] } — permanently deletes orders.
// Access is checked in middleware (same permission as DELETE /api/leads/:id);
// the UI asks the user to type "delete" first.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `At most ${MAX_IDS} ids per request` }, { status: 400 });
  }
  if (!ids.every((id) => typeof id === "string" && UUID.test(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await createServiceClient()
    .from("leads")
    .delete()
    .in("id", ids as string[])
    .select("id");
  if (error) {
    console.error("[leads/bulk-delete]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: data?.length ?? 0 });
}
