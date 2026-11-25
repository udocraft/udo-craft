import { requireAdminPermission } from "@/lib/authz/guard";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

async function keycrmGet(apiKey: string, pathname: string, params: Record<string, string | number>) {
  if (!apiKey) {
    throw new Error("KEYCRM_API_KEY is not configured");
  }

  const url = new URL(`https://openapi.keycrm.app/v1/${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

async function fetchRecentOrders(apiKey: string, pages: number) {
  const orders: KeycrmOrder[] = [];
  const pageCount = Math.max(1, Math.min(pages, 10));

  for (let page = 1; page <= pageCount; page += 1) {
    const data = await keycrmGet(apiKey, "order", {
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

type ExistingLead = { id: string; status: string; notes: string | null; tags: string[] | null; customer_data: Record<string, any> | null };

/**
 * Upsert one KeyCRM order without clobbering work done in the admin:
 * - unchanged remote orders (same updated_at) are skipped;
 * - the local status is kept unless the KeyCRM status group itself changed;
 * - local-only customer_data keys and non-empty staff notes are kept;
 * - items are matched by KeyCRM product id, so rows linked to ERP production
 *   orders keep their ids.
 */
async function syncOrder(order: KeycrmOrder, existing: ExistingLead | undefined): Promise<"created" | "updated" | "skipped"> {
  const service = createServiceClient();
  const remoteUpdatedAt = order.updated_at ? String(order.updated_at) : null;
  const remoteCustomer = { ...customerData(order), keycrm_updated_at: remoteUpdatedAt };
  const tags = (order.tags ?? []).map((tag: any) => tag.name || tag.alias || String(tag.id)).filter(Boolean);

  if (existing && remoteUpdatedAt && existing.customer_data?.keycrm_updated_at === remoteUpdatedAt) {
    return "skipped";
  }

  const statusGroupChanged = existing?.customer_data?.keycrm_status_group_id !== (order.status_group_id ?? null);
  const payload: Record<string, unknown> = existing
    ? {
        customer_data: { ...(existing.customer_data ?? {}), ...remoteCustomer },
        total_amount_cents: moneyToCents(order.grand_total),
        // Staff tags are kept; KeyCRM tags are added to them.
        tags: [...new Set([...(existing.tags ?? []), ...tags])],
        updated_at: order.updated_at || new Date().toISOString(),
        ...(statusGroupChanged ? { status: mapStatus(order.status_group_id) } : {}),
        ...(existing.notes?.trim() ? {} : { notes: orderNotes(order) }),
      }
    : {
        status: mapStatus(order.status_group_id),
        total_amount_cents: moneyToCents(order.grand_total),
        customer_data: remoteCustomer,
        notes: orderNotes(order),
        tags,
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || new Date().toISOString(),
      };

  const result = existing
    ? await service.from("leads").update(payload).eq("id", existing.id).select("id").single()
    : await service.from("leads").insert(payload).select("id").single();

  if (result.error || !result.data) {
    throw new Error(`Lead sync failed for KeyCRM ${order.id}: ${result.error?.message}`);
  }
  const leadId = result.data.id as string;

  const rows = itemRows(order, leadId);
  const { data: currentItems, error: itemsLookupError } = await service
    .from("order_items")
    .select("id, technical_metadata")
    .eq("lead_id", leadId);
  if (itemsLookupError) throw new Error(`Item lookup failed for KeyCRM ${order.id}: ${itemsLookupError.message}`);

  const idByRemote = new Map<string, string>();
  const metaById = new Map<string, Record<string, unknown>>();
  for (const item of currentItems ?? []) {
    const meta = (item.technical_metadata as Record<string, unknown> | null) ?? {};
    metaById.set(item.id, meta);
    const remoteId = meta.keycrm_order_product_id;
    if (remoteId != null) idByRemote.set(String(remoteId), item.id);
  }
  const keep = new Set<string>();
  const inserts: typeof rows = [];
  for (const row of rows) {
    const localId = idByRemote.get(String(row.technical_metadata?.keycrm_order_product_id));
    if (localId) {
      keep.add(localId);
      // Merge metadata so keys added in the admin (notes, mockups) survive.
      const merged = { ...row, technical_metadata: { ...(metaById.get(localId) ?? {}), ...(row.technical_metadata ?? {}) } };
      const { error } = await service.from("order_items").update(merged).eq("id", localId);
      if (error) throw new Error(`Item update failed for KeyCRM ${order.id}: ${error.message}`);
    } else {
      inserts.push(row);
    }
  }
  const stale = (currentItems ?? []).map((i) => i.id).filter((id) => !keep.has(id));
  if (stale.length) {
    const { error } = await service.from("order_items").delete().in("id", stale);
    if (error) throw new Error(`Item cleanup failed for KeyCRM ${order.id}: ${error.message}`);
  }
  if (inserts.length) {
    const { error } = await service.from("order_items").insert(inserts);
    if (error) throw new Error(`Item sync failed for KeyCRM ${order.id}: ${error.message}`);
  }

  return existing ? "updated" : "created";
}

/** All leads already linked to these KeyCRM orders, in one query. */
async function existingLeadsFor(orders: KeycrmOrder[]): Promise<Map<string, ExistingLead>> {
  const ids = [...new Set(orders.map((o) => String(o.id)))].filter((id) => /^\d+$/.test(id));
  const map = new Map<string, ExistingLead>();
  if (!ids.length) return map;
  const { data, error } = await createServiceClient()
    .from("leads")
    .select("id, status, notes, tags, customer_data")
    .filter("customer_data->>keycrm_id", "in", `(${ids.join(",")})`);
  if (error) throw new Error(`Lead lookup failed: ${error.message}`);
  for (const lead of data ?? []) {
    const keycrmId = (lead.customer_data as Record<string, unknown> | null)?.keycrm_id;
    if (keycrmId != null) map.set(String(keycrmId), lead as ExistingLead);
  }
  return map;
}

export async function POST(request: NextRequest) {
  const authz = await requireAdminPermission("erp.manage");
  if (!authz.ok) return authz.response;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check feature flags in app_settings
    const { data: settingsData } = await supabase.from("app_settings").select("value").eq("key", "keycrm").single();
    const settings = settingsData?.value || { enabled: true, sync_pages: 2 };
    
    if (!settings.enabled) {
      return NextResponse.json({ error: "KeyCRM sync is disabled in settings" }, { status: 400 });
    }

    const apiKey = settings.api_key || process.env.KEYCRM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "KeyCRM API key not configured" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const pages = Number(body.pages ?? settings.sync_pages ?? 2);
    const orders = await fetchRecentOrders(apiKey, pages);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const existingById = await existingLeadsFor(orders);
    for (const order of orders) {
      const result = await syncOrder(order, existingById.get(String(order.id)));
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
      else skipped += 1;
    }

    // Update last sync time
    await supabase.from("app_settings").upsert({
      key: "keycrm",
      value: { ...settings, last_sync_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
      updated_by: user.id
    });

    return NextResponse.json({
      ok: true,
      fetched: orders.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

