import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const CONFIRMATION_PHRASE = "HARD RESET ALL DATA";

const RESET_TABLES = [
  "customizer_share_comments",
  "customizer_shares",
  "messages",
  "order_items",
  "leads",
  "site_events",
  "erp_stock_movements",
  "erp_stock_transfer_lines",
  "erp_stock_transfers",
  "erp_finished_goods",
  "erp_processing_acts",
  "erp_production_order_lines",
  "erp_production_orders",
  "product_variant_recipe_lines",
  "product_variant_skus",
  "product_recipe_lines",
  "erp_goods_receipt_lines",
  "erp_goods_receipts",
  "erp_materials",
  "erp_material_types",
  "erp_suppliers",
  "erp_warehouses",
  "product_color_variants",
  "print_zones",
  "print_type_pricing",
  "print_areas",
  "size_charts",
  "products",
  "categories",
  "materials",
  "print_presets",
  "cms_content",
  "user_ai_quota",
] as const;

function isMissingTableError(message: string) {
  return message.includes("does not exist") || message.includes("Could not find the table");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.confirmation !== CONFIRMATION_PHRASE) {
    return NextResponse.json({ error: "Confirmation phrase mismatch" }, { status: 400 });
  }

  const service = createServiceClient();
  const results: Array<{ table: string; deleted: number | null; skipped?: boolean }> = [];

  for (const table of RESET_TABLES) {
    const { count, error } = await service
      .from(table)
      .delete({ count: "exact" })
      .not("id", "is", null);

    if (error) {
      if (isMissingTableError(error.message)) {
        results.push({ table, deleted: 0, skipped: true });
        continue;
      }

      return NextResponse.json(
        { error: `Failed to reset ${table}: ${error.message}`, results },
        { status: 500 },
      );
    }

    results.push({ table, deleted: count ?? null });
  }

  return NextResponse.json({
    ok: true,
    reset_by: user.email ?? user.id,
    results,
  });
}
