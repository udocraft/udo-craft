import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminPermission } from "@/lib/authz/guard";
import { logAdminAuditEvent } from "@/lib/authz/audit";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const CONFIRMATION_PHRASE = "hard reset";

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
  const authz = await requireAdminPermission("system.hard_reset");
  if (!authz.ok) return authz.response;

  if (process.env.NODE_ENV === "production" && process.env.HARD_RESET_ENABLED !== "true") {
    return NextResponse.json({ error: "Повне очищення даних вимкнено" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body?.confirmation !== "string" || body.confirmation.trim() !== CONFIRMATION_PHRASE) {
    return NextResponse.json({ error: "Невірна фраза підтвердження" }, { status: 400 });
  }

  if (!authz.user.email || typeof body?.password !== "string" || body.password.length === 0) {
    return NextResponse.json({ error: "Введіть пароль адмін-акаунта" }, { status: 400 });
  }

  const { url, anonKey } = getSupabasePublicEnv();
  const verifier = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email: authz.user.email,
    password: body.password,
  });
  if (passwordError) {
    return NextResponse.json({ error: "Невірний пароль адмін-акаунта" }, { status: 401 });
  }

  const allowedSet = new Set<string>(RESET_TABLES);
  let tablesToReset: readonly string[] = RESET_TABLES;

  if (Array.isArray(body.tables) && body.tables.length > 0) {
    const invalid = body.tables.filter((t: unknown) => typeof t !== "string" || !allowedSet.has(t));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Невідомі таблиці: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }
    tablesToReset = body.tables as string[];
  }

  const service = createServiceClient();
  const results: Array<{ table: string; deleted: number | null; skipped?: boolean }> = [];

  for (const table of tablesToReset) {
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
        { error: `Не вдалося очистити таблицю ${table}: ${error.message}`, results },
        { status: 500 },
      );
    }

    results.push({ table, deleted: count ?? null });
  }

  await logAdminAuditEvent({
    actorUserId: authz.user.id,
    action: "system.hard_reset",
    resourceType: "database",
    metadata: { tables: tablesToReset, results },
  });

  return NextResponse.json({
    ok: true,
    reset_by: authz.user.email ?? authz.user.id,
    results,
  });
}
