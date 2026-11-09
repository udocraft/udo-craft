import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { CabinetMessageRequestSchema } from "@udo-craft/shared";
import { parseJsonBody } from "@/lib/api/request";

// This route reads and writes messages for the currently authenticated user's leads.
// We use the session-based createClient() throughout so that Supabase RLS policies
// scope all queries to the authenticated user automatically:
//   - Lead ownership is verified via RLS (customer_data->>'email' = auth.email())
//   - Messages are scoped to leads the user owns via the lead_id foreign key
// No service role is required here — all operations are on data belonging to the
// currently authenticated user.

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = new URL(request.url).searchParams.get("lead_id");
  if (!leadId) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  // Verify this lead belongs to the user using the session-based client (RLS enforced).
  const { data: lead } = await supabase
    .from("leads")
    .select("id, customer_data")
    .eq("id", leadId)
    .eq("customer_data->>email", user.email)
    .single();

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark unread manager messages as read
  const unread = (data || []).filter((m) => m.sender === "manager" && !m.read_at);
  if (unread.length) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((m) => m.id));
    unread.forEach((m) => { m.read_at = new Date().toISOString(); });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsedBody = await parseJsonBody(request, CabinetMessageRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;
  const { lead_id, body, attachments } = parsedBody.data;

  // Verify ownership using the session-based client (RLS enforced).
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", lead_id)
    .eq("customer_data->>email", user.email)
    .single();

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("messages")
    .insert({ lead_id, body: body?.trim() || "", sender: "client", sender_email: user.email, attachments: attachments || [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
