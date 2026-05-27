import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KEYCRM_API_KEY = process.env.KEYCRM_API_KEY;

type KeycrmOrder = Record<string, any>;

function moneyToCents(value: unknown) {
  return Math.round(Number(value || 0) * 100);
}

function mapStatus(groupId: number | null | undefined) {
  switch (groupId) {
    case 1: return "new";
    case 2: return "in_progress";
    case 3: return "production";
    case 4: return "completed";
    case 5: return "archived";
    default: return "new";
  }
}

function propertyValue(properties: any[] | undefined, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  return properties?.find((property) => {
    const name = String(property?.name || "").toLowerCase();
    return normalizedNames.some((needle) => name.includes(needle));
  })?.value;
}

async function keycrmGet(pathname: string, params: Record<string, string | number>) {
  if (!KEYCRM_API_KEY) {
    throw new Error("KEYCRM_API_KEY is not configured");
  }

  const url = new URL(`https://openapi.keycrm.app/v1/${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KEYCRM_API_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`KeyCRM ${pathname} failed: HTTP ${response.status} ${body}`);
  }

  return response.json();
}

async function fetchRecentOrders(pages: number) {
  const orders: KeycrmOrder[] = [];
  const pageCount = Math.max(1, Math.min(pages, 10));

  for (let page = 1; page <= pageCount; page += 1) {
    const data = await keycrmGet("order", {
      limit: 50,
      page,
      include: "buyer,products,payments,shipping,manager,tags,custom_fields",
    });
    orders.push(...(data.data ?? []));
    if (!data.next_page_url || page >= data.last_page) break;
  }

  return orders;
}

function customerData(order: KeycrmOrder) {
  const buyer = order.buyer ?? {};
  const shipping = order.shipping ?? {};
  const manager = order.manager ?? {};

  return {
    name: buyer.full_name || shipping.recipient_full_name || `KeyCRM #${order.id}`,
    phone: buyer.phone || shipping.recipient_phone || "",
    email: buyer.email || "",
    company: buyer.company_id ? String(buyer.company_id) : "",
    comment: order.client_comment || order.buyer_comment || "",
    delivery_details: shipping.full_address || shipping.shipping_address || shipping.shipping_receive_point || "",
    delivery: shipping.shipping_preferred_method || "",
    keycrm_id: order.id,
    keycrm_client_id: order.client_id ?? buyer.id ?? null,
    keycrm_source_id: order.source_id ?? null,
    keycrm_source_uuid: order.source_uuid ?? null,
    keycrm_global_source_uuid: order.global_source_uuid ?? null,
    keycrm_status_id: order.status_id ?? null,
    keycrm_status_group_id: order.status_group_id ?? null,
    keycrm_status_changed_at: order.status_changed_at ?? null,
    keycrm_status_expired_at: order.status_expired_at ?? null,
    keycrm_ordered_at: order.ordered_at ?? null,
    keycrm_payment_status: order.payment_status ?? null,
    keycrm_payments_total_cents: moneyToCents(order.payments_total),
    keycrm_products_total_cents: moneyToCents(order.products_total),
    keycrm_discount_cents: moneyToCents(order.discount_amount),
    keycrm_expenses_cents: moneyToCents(order.expenses_sum),
    keycrm_margin_cents: moneyToCents(order.margin_sum),
    keycrm_shipping_price_cents: moneyToCents(order.shipping_price),
    keycrm_manager_name: manager.full_name || [manager.first_name, manager.last_name].filter(Boolean).join(" ") || "",
    keycrm_manager_username: manager.username || "",
    keycrm_recipient_name: shipping.recipient_full_name || "",
    keycrm_recipient_phone: shipping.recipient_phone || "",
    keycrm_tracking_code: shipping.tracking_code || "",
    keycrm_shipping_status: shipping.shipping_status || "",
    keycrm_shipping_date: shipping.shipping_date || null,
  };
}

function orderNotes(order: KeycrmOrder) {
  return [
    order.manager_comment && `Manager: ${order.manager_comment}`,
    order.client_comment && `Client: ${order.client_comment}`,
    order.buyer_comment && `Buyer: ${order.buyer_comment}`,
    order.gift_message && `Gift: ${order.gift_message}`,
  ].filter(Boolean).join("\n");
}

function itemRows(order: KeycrmOrder, leadId: string) {
  return (order.products ?? []).map((product: any) => {
    const props = product.properties ?? [];
    const size = propertyValue(props, ["розмір", "size"]) || "Standard";
    const color = propertyValue(props, ["колір", "color"]) || "Standard";
    const unitPriceCents = moneyToCents(product.price_sold ?? product.price);

    return {
      lead_id: leadId,
      product_id: null,
      quantity: Math.max(1, Math.round(Number(product.quantity || 1))),
      size,
      color,
      mockup_url: product.picture?.thumbnail || product.picture?.url || "",
      unit_price_cents: unitPriceCents,
      technical_metadata: {
        unit_price_cents: unitPriceCents,
        keycrm_order_product_id: product.id,
        keycrm_product_name: product.name,
        keycrm_sku: product.sku,
        keycrm_quantity: product.quantity,
        keycrm_variation_id: product.variation_id,
        keycrm_price_cents: moneyToCents(product.price),
        keycrm_price_sold_cents: moneyToCents(product.price_sold),
        keycrm_purchased_price_cents: moneyToCents(product.purchased_price),
        keycrm_discount_cents: moneyToCents(product.total_discount),
        keycrm_stock_status: product.stock_status,
        keycrm_shipment_type: product.shipment_type,
        item_note: product.comment || product.name,
        properties: props,
      },
      created_at: product.created_at || order.created_at || new Date().toISOString(),
      updated_at: product.updated_at || order.updated_at || new Date().toISOString(),
    };
  });
}

async function syncOrder(order: KeycrmOrder) {
  const service = createServiceClient();
  const { data: existing, error: lookupError } = await service
    .from("leads")
    .select("id")
    .filter("customer_data->>keycrm_id", "eq", String(order.id))
    .maybeSingle();

  if (lookupError) throw new Error(`Lead lookup failed for KeyCRM ${order.id}: ${lookupError.message}`);

  const payload = {
    status: mapStatus(order.status_group_id),
    total_amount_cents: moneyToCents(order.grand_total),
    customer_data: customerData(order),
    notes: orderNotes(order),
    tags: (order.tags ?? []).map((tag: any) => tag.name || tag.alias || String(tag.id)).filter(Boolean),
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
  };

  const result = existing
    ? await service.from("leads").update(payload).eq("id", existing.id).select("id").single()
    : await service.from("leads").insert(payload).select("id").single();

  if (result.error || !result.data) {
    throw new Error(`Lead sync failed for KeyCRM ${order.id}: ${result.error?.message}`);
  }

  await service.from("order_items").delete().eq("lead_id", result.data.id);
  const rows = itemRows(order, result.data.id);
  if (rows.length) {
    const { error } = await service.from("order_items").insert(rows);
    if (error) throw new Error(`Item sync failed for KeyCRM ${order.id}: ${error.message}`);
  }

  return existing ? "updated" : "created";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const pages = Number(body.pages ?? 2);
    const orders = await fetchRecentOrders(pages);
    let created = 0;
    let updated = 0;

    for (const order of orders) {
      const result = await syncOrder(order);
      if (result === "created") created += 1;
      else updated += 1;
    }

    return NextResponse.json({
      ok: true,
      fetched: orders.length,
      created,
      updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
