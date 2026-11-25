import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendNewMessageNotification } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

const MAX_BATCH_LEADS = 500;
const ID_CHUNK = 100;
const PREVIEW_COLUMNS = "id, lead_id, body, sender, created_at, read_at, attachments";

/** Latest message per lead, queried in chunks so the id list never hits URL limits. */
async function lastMessagesFor(ids: string[]) {
  const service = serviceClient();
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) chunks.push(ids.slice(i, i + ID_CHUNK));
  const results = await Promise.all(
    chunks.map((chunk) =>
      service.from("messages").select(PREVIEW_COLUMNS).in("lead_id", chunk).order("created_at", { ascending: false }),
    ),
  );
  const lastByLead: Record<string, Record<string, unknown>> = {};
  for (const { data, error } of results) {
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const msg of data ?? []) {
      if (!lastByLead[msg.lead_id]) lastByLead[msg.lead_id] = msg;
    }
  }
  return NextResponse.json(lastByLead);
}

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const leadId = url.searchParams.get("lead_id");
  const leadIds = url.searchParams.get("lead_ids"); // comma-separated batch

  // Batch: return last message per lead (for sidebar previews)
  if (leadIds) {
    const ids = leadIds.split(",").filter(Boolean);
    if (!ids.length) return NextResponse.json({});
    if (ids.length > MAX_BATCH_LEADS) {
      return NextResponse.json({ error: `At most ${MAX_BATCH_LEADS} lead_ids per request` }, { status: 400 });
    }
    return lastMessagesFor(ids);
  }

  if (!leadId) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const { data, error } = await serviceClient()
    .from("messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark unread client messages as read
  const unread = (data || []).filter((m) => m.sender === "client" && !m.read_at);
  if (unread.length) {
    await serviceClient()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((m) => m.id));
    unread.forEach((m) => { m.read_at = new Date().toISOString(); });
  }

  return NextResponse.json(data);
}

async function forwardToTelegram(tgChatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !tgChatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: tgChatId, text }),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lead_id, body, attachments } = await request.json();
  if (!lead_id || (!body?.trim() && !attachments?.length)) {
    return NextResponse.json({ error: "lead_id and body or attachments required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ lead_id, body: body?.trim() || "", sender: "manager", sender_email: user.email, attachments: attachments || [], channel: "web" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Forward reply to Telegram if this lead came from Telegram
  if (body?.trim()) {
    const { data: lead } = await serviceClient()
      .from("leads")
      .select("source, tg_chat_id, customer_data")
      .eq("id", lead_id)
      .single();
    if (lead?.source === "telegram" && lead.tg_chat_id) {
      await forwardToTelegram(lead.tg_chat_id, body.trim());
    } else if (lead && body?.trim()) {
      // Non-Telegram lead — notify customer by email
      const email = lead.customer_data?.email;
      const name = lead.customer_data?.name;
      if (email && !email.includes("@telegram.placeholder")) {
        sendNewMessageNotification({
          to: email,
          name: name ?? "Клієнт",
          preview: body.trim(),
          leadId: lead_id,
        }).catch((err) => console.error("Message notification email failed:", err));
      }
    }
  }

  return NextResponse.json(data, { status: 201 });
}
