import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from apps/admin/.env
dotenv.config({ path: path.resolve(__dirname, "../apps/admin/.env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEYCRM_API_KEY = process.env.KEYCRM_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/admin/.env");
  process.exit(1);
}

if (!KEYCRM_API_KEY) {
  console.error("❌ Missing KEYCRM_API_KEY in apps/admin/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map KeyCRM status_group_id to our lead_status enum
function mapStatus(groupId: number | null): string {
  switch (groupId) {
    case 1: return "new";
    case 2: return "in_progress";
    case 3: return "production";
    case 4: return "completed";
    case 5: return "archived";
    default: return "new";
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncKeyCrmOrders() {
  console.log("🚀 Starting KeyCRM orders synchronization to Supabase...");
  let page = 1;
  const limit = 50;
  let totalSynced = 0;
  let totalSkipped = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`\n📦 Fetching KeyCRM orders (Page ${page})...`);
    const url = `https://openapi.keycrm.app/v1/order?limit=${limit}&page=${page}&include=buyer,products`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${KEYCRM_API_KEY}`,
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        console.error(`❌ KeyCRM API error: HTTP ${res.status} - ${res.statusText}`);
        const text = await res.text();
        console.error("Response:", text);
        break;
      }

      const data = await res.json();
      const orders = data.data || [];

      if (orders.length === 0) {
        console.log("✅ No more orders found in KeyCRM.");
        break;
      }

      console.log(`🔍 Processing ${orders.length} orders from page ${page}...`);

      for (const order of orders) {
        const keycrmId = order.id;

        // Check if lead already exists in Supabase by keycrm_id
        const { data: existingLead, error: searchError } = await supabase
          .from("leads")
          .select("id")
          .filter("customer_data->keycrm_id", "eq", keycrmId)
          .maybeSingle();

        if (searchError && searchError.code !== "PGRST116") {
          console.error(`❌ Error searching lead for KeyCRM ID ${keycrmId}:`, searchError.message);
          continue;
        }

        if (existingLead) {
          totalSkipped++;
          continue;
        }

        // Prepare lead data
        const leadStatus = mapStatus(order.status_group_id);
        const totalAmountCents = Math.round((order.grand_total || 0) * 100);
        const buyer = order.buyer || {};

        const customerData = {
          name: buyer.full_name || "Невідомий клієнт",
          phone: buyer.phone || "",
          email: buyer.email || "",
          company: "",
          keycrm_id: keycrmId,
          keycrm_source_uuid: order.source_uuid,
          keycrm_global_source_uuid: order.global_source_uuid,
        };

        const { data: newLead, error: insertLeadError } = await supabase
          .from("leads")
          .insert({
            status: leadStatus,
            total_amount_cents: totalAmountCents,
            customer_data: customerData,
            notes: order.manager_comment || "",
            created_at: order.created_at || new Date().toISOString(),
            updated_at: order.updated_at || new Date().toISOString(),
          })
          .select()
          .single();

        if (insertLeadError || !newLead) {
          console.error(`❌ Error inserting lead for KeyCRM ID ${keycrmId}:`, insertLeadError?.message);
          continue;
        }

        // Prepare order items
        const products = order.products || [];
        if (products.length > 0) {
          const itemsRows = products.map((p: any) => {
            const props = p.properties || [];
            const sizeProp = props.find((x: any) => x.name?.toLowerCase().includes("розмір") || x.name?.toLowerCase().includes("size"))?.value || "Standard";
            const colorProp = props.find((x: any) => x.name?.toLowerCase().includes("колір") || x.name?.toLowerCase().includes("color"))?.value || "Standard";

            return {
              lead_id: newLead.id,
              product_id: null,
              quantity: p.quantity || 1,
              size: sizeProp,
              color: colorProp,
              mockup_url: p.picture?.thumbnail || "",
              unit_price_cents: Math.round((p.price || 0) * 100),
              technical_metadata: {
                unit_price_cents: Math.round((p.price || 0) * 100),
                keycrm_product_id: p.id,
                keycrm_product_name: p.name,
                item_note: p.name,
                properties: props,
              },
              created_at: p.created_at || order.created_at || new Date().toISOString(),
              updated_at: p.updated_at || order.updated_at || new Date().toISOString(),
            };
          });

          const { error: insertItemsError } = await supabase
            .from("order_items")
            .insert(itemsRows);

          if (insertItemsError) {
            console.error(`❌ Error inserting order items for Lead ${newLead.id}:`, insertItemsError.message);
          }
        }

        totalSynced++;
      }

      console.log(`📊 Progress: Synced ${totalSynced} new orders. Skipped ${totalSkipped} existing orders.`);

      if (page >= data.last_page || orders.length < limit) {
        hasMore = false;
      } else {
        page++;
        await sleep(300); // Polite delay between API requests
      }
    } catch (err: any) {
      console.error(`❌ Unexpected error on page ${page}:`, err.message || err);
      break;
    }
  }

  console.log("\n🎉 KeyCRM Synchronization Complete!");
  console.log(`✅ Total newly synced orders: ${totalSynced}`);
  console.log(`⏩ Total skipped (already exist): ${totalSkipped}`);
}

syncKeyCrmOrders().catch(err => {
  console.error("❌ Fatal error in sync script:", err);
  process.exit(1);
});
