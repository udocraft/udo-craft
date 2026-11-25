import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { AdminLeadUpdateSchema, canTransitionLead, leadStatusLabel } from "@udo-craft/shared";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await getServiceClient()
      .from("leads")
      .select("*, order_items!order_items_lead_id_fkey(*)")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = AdminLeadUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const update = parsed.data;
    const service = getServiceClient();

    let query = service.from("leads").update(update).eq("id", params.id);
    let previousStatus: string | null = null;

    if (update.status) {
      const { data: current, error: currentError } = await service
        .from("leads")
        .select("status")
        .eq("id", params.id)
        .single();
      if (currentError || !current) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (!canTransitionLead(current.status, update.status)) {
        return NextResponse.json(
          { error: `Не можна змінити статус: ${leadStatusLabel(current.status)} → ${leadStatusLabel(update.status)}`, code: "invalid_transition" },
          { status: 409 },
        );
      }
      // Compare-and-set: if someone else changed the status meanwhile, nothing is updated.
      previousStatus = current.status;
      query = query.eq("status", current.status);
    }

    const { data, error } = await query.select().maybeSingle();

    if (!error && !data) {
      return NextResponse.json({ error: "Статус уже змінено іншим користувачем. Оновіть сторінку.", code: "conflict" }, { status: 409 });
    }

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit trail: every status change leaves a note in the order chat, whichever
    // screen it came from. Not forwarded to the customer.
    if (update.status && previousStatus && previousStatus !== update.status) {
      const { error: logError } = await service.from("messages").insert({
        lead_id: params.id,
        body: `Статус змінено: ${leadStatusLabel(previousStatus)} → ${leadStatusLabel(update.status)}`,
        sender: "manager",
        sender_email: user.email,
        attachments: [],
        channel: "web",
      });
      if (logError) console.error("Status audit message failed:", logError);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await getServiceClient()
      .from("leads")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
