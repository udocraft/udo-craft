import { NextResponse } from "next/server";
import type { AdminPermission } from "@udo-craft/authz";
import { requireAdminPermission } from "@/lib/authz/guard";
import { createServiceClient } from "@/lib/supabase/service";

export async function requireErpUser(permission: AdminPermission = "erp.read") {
  const authz = await requireAdminPermission(permission);
  if (!authz.ok) return { user: null, service: null, error: authz.response };
  return { user: authz.user, service: createServiceClient(), error: null };
}

export function apiError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status });
}

export function moneyToCents(value: unknown) {
  return Math.round(Number(value || 0) * 100);
}

type Service = ReturnType<typeof createServiceClient>;

/** True when the database does not have the function yet (migration not applied). */
function isMissingFunction(error: { code?: string } | null) {
  return error?.code === "PGRST202" || error?.code === "42883";
}

/**
 * Change a material's stock by `delta` in one atomic UPDATE (DB function from
 * migration 20261125100000_erp_atomic_stock). Until that migration is applied it
 * falls back to the old read-then-write, so postings keep working.
 */
export async function adjustMaterialStock(service: Service, materialId: string, delta: number, unitCostCents?: number) {
  const { error } = await service.rpc("erp_adjust_material_stock", {
    p_material_id: materialId,
    p_delta: delta,
    p_unit_cost_cents: unitCostCents ?? null,
  });
  if (!error) return;
  if (!isMissingFunction(error)) throw new Error(error.message);

  const { data, error: readError } = await service.from("erp_materials").select("stock_quantity").eq("id", materialId).single();
  if (readError) throw new Error(readError.message);
  const { error: writeError } = await service
    .from("erp_materials")
    .update({
      stock_quantity: Number(data?.stock_quantity || 0) + delta,
      ...(unitCostCents !== undefined ? { unit_cost_cents: unitCostCents } : {}),
    })
    .eq("id", materialId);
  if (writeError) throw new Error(writeError.message);
}

/** Add finished goods to a warehouse atomically, with the same fallback. */
export async function addFinishedGoods(service: Service, variantSkuId: string, warehouseId: string | null, quantity: number) {
  const { error } = await service.rpc("erp_add_finished_goods", {
    p_variant_sku_id: variantSkuId,
    p_warehouse_id: warehouseId,
    p_quantity: quantity,
  });
  if (!error) return;
  if (!isMissingFunction(error)) throw new Error(error.message);

  const { data: existing, error: readError } = await service
    .from("erp_finished_goods")
    .select("id, quantity")
    .eq("variant_sku_id", variantSkuId)
    .filter("warehouse_id", warehouseId ? "eq" : "is", warehouseId ?? null)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  const { error: writeError } = existing
    ? await service.from("erp_finished_goods").update({ quantity: Number(existing.quantity || 0) + quantity }).eq("id", existing.id)
    : await service.from("erp_finished_goods").insert({ variant_sku_id: variantSkuId, warehouse_id: warehouseId, quantity });
  if (writeError) throw new Error(writeError.message);
}
