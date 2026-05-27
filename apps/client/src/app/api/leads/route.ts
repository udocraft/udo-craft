import { CreateLeadSchema } from "@udo-craft/shared";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabasePublicEnv, getSupabaseServiceEnv } from "@/lib/supabase/env";
import { sendOrderConfirmation, sendContactNotification } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// This is a public endpoint — customers submit orders without being authenticated.
// There is no user session to derive a Supabase client from, so the session-based
// createClient() cannot be used here. Prefer the service role key when configured;
// if it is missing in a deploy target, fall back to the anon insert policies.
// The honeypot check and rate limiting below mitigate abuse of this open endpoint.

export async function POST(request: NextRequest) {
  const { success } = await rateLimit(request, { limit: 5, window: 60 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const serviceEnv = getSupabaseServiceEnv();
    const publicEnv = getSupabasePublicEnv();
    const hasServiceRoleKey = Boolean(serviceEnv.serviceRoleKey);
    const supabase = hasServiceRoleKey
      ? createServiceClient()
      : createClient(publicEnv.url, publicEnv.anonKey);

    const body = await request.json();
    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { status, total_amount_cents } = parsed.data;
    const customer_data = {
      ...(body.customer_data ?? {}),
      name: parsed.data.customer_data.name,
      email: parsed.data.customer_data.email,
      phone: parsed.data.customer_data.phone,
      social_channel: parsed.data.customer_data.social_channel,
    };

    // Honeypot check — bots fill this field, real users don't
    if (customer_data.website) {
      return NextResponse.json({ id: "bot-rejected" }, { status: 200 });
    }

    const { order_items, initial_message, visitor_id, session_id } = body;
    // attachments is an extra field not covered by CreateLeadSchema — read from raw body
    const attachments: string[] = body.customer_data?.attachments ?? [];

    const leadId = crypto.randomUUID();
    const leadPayload = {
      id: leadId,
      status,
      customer_data,
      total_amount_cents: total_amount_cents || 0,
      visitor_id,
      session_id,
    };

    const { data: lead, error: leadError } = hasServiceRoleKey
      ? await supabase.from("leads").insert(leadPayload).select().single()
      : {
          data: leadPayload,
          error: (await supabase.from("leads").insert(leadPayload)).error,
        };

    if (leadError || !lead) {
      console.error("Lead insert error:", leadError);
      return NextResponse.json({ error: leadError?.message ?? "Помилка створення" }, { status: 500 });
    }

    if (Array.isArray(order_items) && order_items.length > 0) {
      const items = order_items.map((item: {
        product_id: string;
        quantity: number;
        size: string;
        color: string;
        custom_print_url?: string | null;
        unit_price_cents?: number | null;
        print_cost_cents?: number | null;
      }) => ({
        ...item,
        lead_id: lead.id,
        unit_price_cents: item.unit_price_cents ?? null,
        print_cost_cents: item.print_cost_cents ?? null,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);

      if (itemsError) {
        console.error("Order items insert error:", itemsError);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }
    }

    // Insert initial message into messages table if provided
    if (initial_message?.trim() || attachments.length) {
      const messageBody = [
        initial_message?.trim(),
        attachments.length
          ? `Вкладення: ${attachments.join(", ")}`
          : null,
      ].filter(Boolean).join("\n\n");

      await supabase.from("messages").insert({
        lead_id: lead.id,
        body: messageBody,
        sender: "client",
        sender_email: customer_data.email,
        attachments,
      });
    }

    // Send order confirmation email
    if (customer_data.email && customer_data.name) {
      sendOrderConfirmation({
        to: customer_data.email,
        name: customer_data.name,
        leadId: lead.id,
      }).catch((err) => console.error("Order confirmation email failed:", err));

      // Notify team
      sendContactNotification({
        leadId: lead.id,
        name: customer_data.name,
        email: customer_data.email,
        phone: customer_data.phone,
        company: customer_data.company,
        topic: customer_data.topic,
        source: customer_data.source,
        message: body.initial_message ?? undefined,
      }).catch((err) => console.error("Contact notification email failed:", err));
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Внутрішня помилка сервера" }, { status: 500 });
  }
}
