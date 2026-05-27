import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../apps/admin/.env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEYCRM_API_KEY = process.env.KEYCRM_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/admin/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!KEYCRM_API_KEY) {
  console.error("Missing KEYCRM_API_KEY in apps/admin/.env");
  process.exit(1);
}

function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function mapStatus(groupId) {
  switch (groupId) {
    case 1: return "new";
    case 2: return "in_progress";
    case 3: return "production";
    case 4: return "completed";
    case 5: return "archived";
    default: return "new";
  }
}

function propertyValue(properties, names) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  return properties?.find((property) => {
    const name = String(property?.name || "").toLowerCase();
    return normalizedNames.some((needle) => name.includes(needle));
  })?.value;
}

async function keycrmGet(pathname, params = {}) {
  const url = new URL(`https://openapi.keycrm.app/v1/${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KEYCRM_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`KeyCRM ${pathname} failed: HTTP ${response.status} ${body}`);
  }

  return response.json();
}

async function fetchAllOrders(limit = 50) {
  const rows = [];
  let page = 1;

  for (;;) {
    const data = await keycrmGet("order", {
      limit,
      page,
      include: "buyer,products,payments,shipping,manager,tags,custom_fields",
    });

    rows.push(...(data.data ?? []));
    console.log(`Fetched orders page ${page}/${data.last_page ?? "?"}: total ${rows.length}`);

    if (!data.next_page_url || page >= data.last_page) break;
    page += 1;
  }

  return rows;
}

function customerData(order) {
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

function orderNotes(order) {
  return [
    order.manager_comment && `Manager: ${order.manager_comment}`,
    order.client_comment && `Client: ${order.client_comment}`,
    order.buyer_comment && `Buyer: ${order.buyer_comment}`,
    order.gift_message && `Gift: ${order.gift_message}`,
  ].filter(Boolean).join("\n");
}

function itemRows(order, leadId) {
  return (order.products ?? []).map((product) => {
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

async function findExistingLead(orderId) {
  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .filter("customer_data->>keycrm_id", "eq", String(orderId))
    .maybeSingle();

  if (error) throw new Error(`Lead lookup failed for KeyCRM ${orderId}: ${error.message}`);
  return data;
}

async function syncOrder(order) {
  const existing = await findExistingLead(order.id);
  const payload = {
    status: mapStatus(order.status_group_id),
    total_amount_cents: moneyToCents(order.grand_total),
    customer_data: customerData(order),
    notes: orderNotes(order),
    tags: (order.tags ?? []).map((tag) => tag.name || tag.alias || String(tag.id)).filter(Boolean),
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at || new Date().toISOString(),
  };

  let lead;
  if (existing) {
    const { data, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw new Error(`Lead update failed for KeyCRM ${order.id}: ${error.message}`);
    lead = data;
  } else {
    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`Lead insert failed for KeyCRM ${order.id}: ${error.message}`);
    lead = data;
  }

  const { error: deleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("lead_id", lead.id);
  if (deleteError) throw new Error(`Item refresh failed for KeyCRM ${order.id}: ${deleteError.message}`);

  const rows = itemRows(order, lead.id);
  if (rows.length) {
    const { error } = await supabase.from("order_items").insert(rows);
    if (error) throw new Error(`Item insert failed for KeyCRM ${order.id}: ${error.message}`);
  }

  return existing ? "updated" : "created";
}

async function loadExistingKeycrmIds() {
  const ids = new Set();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("leads")
      .select("customer_data")
      .not("customer_data->>keycrm_id", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Existing KeyCRM lookup failed: ${error.message}`);
    for (const row of data ?? []) {
      if (row.customer_data?.keycrm_id != null) ids.add(String(row.customer_data.keycrm_id));
    }
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

async function main() {
  console.log("Starting KeyCRM orders sync...");
  const missingOnly = process.argv.includes("--missing-only");
  const orders = await fetchAllOrders(50);
  const existingIds = missingOnly ? await loadExistingKeycrmIds() : null;
  const ordersToSync = existingIds
    ? orders.filter((order) => !existingIds.has(String(order.id)))
    : orders;

  if (missingOnly) {
    console.log(`Existing KeyCRM orders in Supabase: ${existingIds.size}`);
    console.log(`Missing KeyCRM orders to sync: ${ordersToSync.length}`);
  }

  let created = 0;
  let updated = 0;

  for (const [index, order] of ordersToSync.entries()) {
    const result = await syncOrder(order);
    if (result === "created") created += 1;
    else updated += 1;

    if ((index + 1) % 50 === 0 || index + 1 === ordersToSync.length) {
      console.log(`Synced ${index + 1}/${ordersToSync.length} orders...`);
    }
  }

  console.log("KeyCRM orders sync complete.");
  console.log(`Orders created: ${created}`);
  console.log(`Orders updated: ${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
