import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { AdminCreateLeadSchema } from "@udo-craft/shared";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DEFAULT_PAGE = 500;
const MAX_PAGE = 2000;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Newest first, one page at a time. `before` is the created_at of the last row
    // already loaded; `view=summary` skips the order_items join for list screens
    // that only need the lead itself (messages sidebar).
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit")) || DEFAULT_PAGE, 1), MAX_PAGE);
    const before = params.get("before");
    const summary = params.get("view") === "summary";

    let query = getServiceClient()
      .from("leads")
      .select(summary ? "*" : "*, order_items!order_items_lead_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (before && !Number.isNaN(Date.parse(before))) query = query.lt("created_at", before);

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    return NextResponse.json(hasMore ? rows.slice(0, limit) : rows, {
      headers: { "X-Has-More": hasMore ? "1" : "0" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API error:", message);
    return NextResponse.json({ error: "Internal server error", detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = AdminCreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { status, customer_data, order_items = [], tags, notes } = parsed.data;

    // Staff may set prices by hand, so item prices are kept, but rounded to whole
    // cents, and the order total is always derived from the lines.
    const rows = order_items.map((item) => {
      const unit = Math.round(item.unit_price_cents ?? 0);
      const print = Math.round(item.print_cost_cents ?? 0);
      return {
        ...item,
        unit_price_cents: unit,
        print_cost_cents: print,
        technical_metadata: { ...(item.technical_metadata ?? {}), unit_price_cents: unit, print_cost_cents: print },
      };
    });
    const total_amount_cents = rows.reduce(
      (sum, r) => sum + (r.unit_price_cents + r.print_cost_cents) * r.quantity,
      0,
    );

    const service = getServiceClient();

    const { data: lead, error } = await service
      .from("leads")
      .insert({
        status,
        customer_data,
        total_amount_cents,
        ...(notes ? { notes } : {}),
        ...(tags && tags.length > 0 ? { tags } : {}),
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (rows.length > 0) {
      const { error: itemsError } = await service
        .from("order_items")
        .insert(rows.map((r) => ({ ...r, lead_id: lead.id })));
      if (itemsError) {
        console.error("order_items insert error:", itemsError);
        // Remove the half-saved order so staff can simply retry.
        await service.from("leads").delete().eq("id", lead.id);
        return NextResponse.json({ error: `Failed to save order items: ${itemsError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
