import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { webhookSecretUnconfigured } from "@/lib/security/webhook-auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Resend inbound email webhook — verified with Svix (whsec_... signing secret)
// Docs: https://resend.com/docs/dashboard/receiving/introduction

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Extract lead ID from To address.
// Convention: lead-<8-char-id>@domain  OR  full UUID before @
function extractLeadId(toAddress: string): string | null {
  const short = toAddress.match(/lead[-_]?([a-f0-9]{8,36})@/i);
  if (short) return short[1];
  const uuid = toAddress.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})@/i);
  if (uuid) return uuid[1];
  return null;
}

// Must read raw body for Svix signature verification
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // ── Signature verification ──────────────────────────────────────────────
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      const unconfigured = webhookSecretUnconfigured();
      if (unconfigured) return unconfigured;
    } else {
      const wh = new Webhook(secret);
      try {
        wh.verify(rawBody, {
          "svix-id":        req.headers.get("svix-id") ?? "",
          "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
          "svix-signature": req.headers.get("svix-signature") ?? "",
        });
      } catch {
        console.warn("[email/inbound] invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // ── Parse payload ───────────────────────────────────────────────────────
    // Resend sends: { type: "email.received", data: { from, to, subject, text, html, ... } }
    const event = JSON.parse(rawBody);
    const payload = event?.data ?? event;

    const rawFrom: string = payload?.from ?? "";
    const rawTo:   string = Array.isArray(payload?.to) ? payload.to[0] : (payload?.to ?? "");
    const subject: string = payload?.subject ?? "";
    const text:    string = payload?.text ?? "";
    const html:    string = payload?.html ?? "";

    if (!rawFrom) {
      return NextResponse.json({ ok: true, skipped: "no from" });
    }

    // Extract clean email + display name from "Name <email>" format
    const fromEmail = (rawFrom.match(/<(.+?)>/) ?? [])[1]?.trim() ?? rawFrom.trim();
    const fromName  = (rawFrom.match(/^(.+?)\s*</) ?? [])[1]?.trim() ?? fromEmail;

    // Build message body — prefer plain text, strip quoted reply history
    const rawBody2 = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const messageBody = rawBody2
      .split(/\n[-–—]{3,}|\nOn .+wrote:|\n>+\s/)[0]
      .trim();

    if (!messageBody) {
      return NextResponse.json({ ok: true, skipped: "empty body after stripping" });
    }

    // ── Resolve lead ────────────────────────────────────────────────────────
    const db = service();
    let leadId: string | null = null;

    // 1. Lead ID encoded in To address (reply-to routing)
    leadId = extractLeadId(rawTo);

    // 2. Look up by sender email
    if (!leadId) {
      const { data: leads } = await db
        .from("leads")
        .select("id")
        .eq("customer_data->>email", fromEmail)
        .order("created_at", { ascending: false })
        .limit(1);
      leadId = leads?.[0]?.id ?? null;
    }

    // 3. Create a new lead for unknown senders
    if (!leadId) {
      const { data: newLead } = await db
        .from("leads")
        .insert({
          status: "new",
          customer_data: {
            name:   fromName,
            email:  fromEmail,
            source: "email_inbound",
            topic:  "other",
          },
          total_amount_cents: 0,
        })
        .select("id")
        .single();
      leadId = newLead?.id ?? null;
    }

    if (!leadId) {
      return NextResponse.json({ error: "Could not resolve lead" }, { status: 500 });
    }

    // ── Insert message ──────────────────────────────────────────────────────
    const fullBody = subject ? `**${subject}**\n\n${messageBody}` : messageBody;

    const { error: msgError } = await db.from("messages").insert({
      lead_id:      leadId,
      body:         fullBody,
      sender:       "client",
      sender_email: fromEmail,
      channel:      "email",
      attachments:  [],
    });

    if (msgError) {
      console.error("[email/inbound] messages insert error:", msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Bump lead so it surfaces at the top of the kanban
    await db
      .from("leads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", leadId);

    console.log(`[email/inbound] from=${fromEmail} → lead=${leadId}`);
    return NextResponse.json({ ok: true, leadId });

  } catch (err) {
    console.error("[email/inbound] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
