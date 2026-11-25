import { CreateLeadRequestSchema } from "@udo-craft/shared";
import { parseJsonBody } from "@/lib/api/request";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabaseServiceEnv } from "@/lib/supabase/env";
import { sendOrderConfirmation, sendContactNotification } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { priceOrderLine, type PricedLayer, type PrintPricingRow } from "@udo-craft/shared";
import { NextRequest, NextResponse } from "next/server";

// SERVICE ROLE JUSTIFICATION:
// This is a public endpoint — customers submit orders without being authenticated.
// There is no user session to derive a Supabase client from, so the session-based
// createClient() cannot be used here. The service role key is required.
// The honeypot check and rate limiting below mitigate abuse of this open endpoint.

/** Print layers as the checkout stores them in technical_metadata.layers. */
function layersFromMetadata(meta: Record<string, unknown> | null | undefined): PricedLayer[] {
  const layers = meta?.layers;
  if (!Array.isArray(layers)) return [];
  return layers.map((l) => {
    const layer = (l ?? {}) as Record<string, unknown>;
    return {
      type: typeof layer.type === "string" ? layer.type : undefined,
      sizeLabel: typeof layer.sizeLabel === "string" ? layer.sizeLabel : undefined,
      isComboChild: layer.isComboChild === true,
    };
  });
}

export async function POST(request: NextRequest) {
  const { success } = await rateLimit(request, { scope: "leads", limit: 5, window: 60 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsedBody = await parseJsonBody(request, CreateLeadRequestSchema);
  if (!parsedBody.ok) return parsedBody.response;
  // `status` and client-sent amounts are ignored: public orders always start as `new`
  // and are priced from the catalogue below.
  const { customer_data: rawCustomer, order_items, initial_message, visitor_id, session_id, client_request_id } = parsedBody.data;
  // Stored lower-case so the customer cabinet finds the order whatever case was typed.
  const customer_data = rawCustomer.email ? { ...rawCustomer, email: rawCustomer.email.trim().toLowerCase() } : rawCustomer;

  try {
    const serviceEnv = getSupabaseServiceEnv();
    if (!serviceEnv.serviceRoleKey) {
      // Anonymous insert policies on leads were removed (rls_hardening migration), so
      // this endpoint cannot work without the service role key.
      console.error("POST /api/leads: SUPABASE_SERVICE_ROLE_KEY is not configured");
      return NextResponse.json({ error: "Сервіс тимчасово недоступний" }, { status: 503 });
    }
    const supabase = createServiceClient();

    // Honeypot check — bots fill this field, real users don't
    if (customer_data.website) {
      return NextResponse.json({ id: "bot-rejected" }, { status: 200 });
    }

    const attachments = customer_data.attachments ?? [];

    const orderItemsInput = order_items ?? [];
    let pricedItems: { item: (typeof orderItemsInput)[number]; price: ReturnType<typeof priceOrderLine> }[] = [];
    if (orderItemsInput.length > 0) {
      const productIds = [...new Set(orderItemsInput.map((item) => item.product_id))];
      const [{ data: products, error: productsError }, { data: printPricing, error: pricingError }] = await Promise.all([
        supabase.from("products").select("id, base_price_cents, discount_grid").in("id", productIds),
        supabase.from("print_type_pricing").select("print_type, size_label, qty_tiers").eq("is_active", true),
      ]);
      if (productsError || pricingError) {
        console.error("Price lookup error:", productsError ?? pricingError);
        return NextResponse.json({ error: "Не вдалося перевірити ціни" }, { status: 500 });
      }
      const productById = new Map((products ?? []).map((p) => [p.id as string, p]));
      for (const item of orderItemsInput) {
        if (!productById.has(item.product_id)) {
          return NextResponse.json({ error: "Некоректна позиція замовлення" }, { status: 400 });
        }
      }
      pricedItems = orderItemsInput.map((item) => {
        const product = productById.get(item.product_id)!;
        return {
          item,
          price: priceOrderLine({
            basePriceCents: product.base_price_cents,
            quantity: item.quantity,
            discountGrid: product.discount_grid,
            layers: layersFromMetadata(item.technical_metadata),
            printPricing: (printPricing ?? []) as PrintPricingRow[],
          }),
        };
      });
    }
    const serverTotalCents = pricedItems.reduce((sum, { price }) => sum + price.lineTotalCents, 0);

    // A client-generated id makes retries idempotent: a second submit of the same
    // checkout hits the primary key and gets the existing order back.
    const leadId = client_request_id ?? crypto.randomUUID();
    const leadPayload = {
      id: leadId,
      status: "new" as const,
      customer_data,
      total_amount_cents: serverTotalCents,
      visitor_id,
      session_id,
    };

    const { data: lead, error: leadError } = await supabase.from("leads").insert(leadPayload).select().single();

    if (leadError?.code === "23505" && client_request_id) {
      // Only a genuine retry of the same checkout gets an answer: same email, still
      // "new", and only the id is returned so a guessed UUID reveals nothing.
      const { data: existing } = await supabase
        .from("leads")
        .select("id, status, customer_data")
        .eq("id", client_request_id)
        .maybeSingle();
      const sameCustomer =
        existing?.status === "new" &&
        typeof customer_data.email === "string" &&
        String(existing.customer_data?.email ?? "").toLowerCase() === customer_data.email;
      if (sameCustomer) return NextResponse.json({ id: existing.id }, { status: 200 });
      return NextResponse.json({ error: "Повторний запит не збігається із замовленням" }, { status: 409 });
    }
    if (leadError || !lead) {
      console.error("Lead insert error:", leadError);
      return NextResponse.json({ error: "Помилка створення замовлення" }, { status: 500 });
    }

    if (pricedItems.length > 0) {
      const items = pricedItems.map(({ item, price }) => ({
        lead_id: lead.id,
        product_id: item.product_id,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        custom_print_url: item.custom_print_url ?? null,
        mockup_url: item.mockup_url ?? null,
        technical_metadata: {
          ...(item.technical_metadata ?? {}),
          unit_price_cents: price.unitPriceCents,
          print_cost_cents: price.printCostCents,
          discount_pct: price.discountPct,
        },
        unit_price_cents: price.unitPriceCents,
        print_cost_cents: price.printCostCents,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);

      if (itemsError) {
        console.error("Order items insert error:", itemsError);
        // Do not leave an order without its lines behind.
        const { error: cleanupError } = await supabase.from("leads").delete().eq("id", lead.id);
        if (cleanupError) console.error("Lead cleanup after items failure failed:", cleanupError);
        return NextResponse.json({ error: "Помилка збереження позицій замовлення" }, { status: 500 });
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

      const { error: messageError } = await supabase.from("messages").insert({
        lead_id: lead.id,
        body: messageBody,
        sender: "client",
        sender_email: customer_data.email,
        attachments,
      });
      // The order itself is saved; a missing first message must not fail checkout.
      if (messageError) console.error("Initial message insert error:", messageError);
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
        message: initial_message ?? undefined,
      }).catch((err) => console.error("Contact notification email failed:", err));
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Внутрішня помилка сервера" }, { status: 500 });
  }
}
