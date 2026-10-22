import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../_lib";

const ActPayload = z.object({
  production_order_id: z.string().uuid(),
  warehouse_id: z.string().uuid().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
  post: z.boolean().default(true),
});

export async function GET() {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { data, error: dbError } = await service!
    .from("erp_processing_acts")
    .select("*, warehouse:erp_warehouses(*), production_order:erp_production_orders(*, lines:erp_production_order_lines(*, variant_sku:product_variant_skus(*)))")
    .order("created_at", { ascending: false })
    .limit(80);
  if (dbError) return apiError(dbError);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { service, user, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = ActPayload.parse(await req.json());
    const { data: order, error: orderError } = await service!
      .from("erp_production_orders")
      .select("*, lines:erp_production_order_lines(*)")
      .eq("id", parsed.production_order_id)
      .single();
    if (orderError) return apiError(orderError);

    const { data: act, error: actError } = await service!
      .from("erp_processing_acts")
      .insert({
        production_order_id: parsed.production_order_id,
        warehouse_id: parsed.warehouse_id,
        comment: parsed.comment,
        status: parsed.post ? "posted" : "draft",
        posted_at: parsed.post ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (actError) return apiError(actError);

    if (parsed.post) {
      for (const line of order.lines ?? []) {
        for (const req of line.material_requirements ?? []) {
          const materialId = req.erp_material_id;
          const qty = Number(req.required_quantity || 0);
          if (!materialId || qty <= 0) continue;
          const { data: material } = await service!
            .from("erp_materials")
            .select("stock_quantity, unit_cost_cents")
            .eq("id", materialId)
            .single();
          await service!
            .from("erp_materials")
            .update({ stock_quantity: Number(material?.stock_quantity || 0) - qty })
            .eq("id", materialId);
          await service!.from("erp_stock_movements").insert({
            erp_material_id: materialId,
            production_order_id: parsed.production_order_id,
            processing_act_id: act.id,
            warehouse_id: parsed.warehouse_id,
            movement_type: "production_consume",
            quantity: -qty,
            unit_cost_cents: Number(material?.unit_cost_cents || 0),
            note: parsed.comment,
            created_by: user!.id,
          });
        }

        if (line.variant_sku_id) {
          const { data: existing } = await service!
            .from("erp_finished_goods")
            .select("id, quantity")
            .eq("variant_sku_id", line.variant_sku_id)
            .eq("warehouse_id", parsed.warehouse_id)
            .maybeSingle();
          if (existing) {
            await service!
              .from("erp_finished_goods")
              .update({ quantity: Number(existing.quantity || 0) + Number(line.quantity || 0) })
              .eq("id", existing.id);
          } else {
            await service!.from("erp_finished_goods").insert({
              variant_sku_id: line.variant_sku_id,
              warehouse_id: parsed.warehouse_id,
              quantity: line.quantity,
            });
          }
        }
      }

      await service!
        .from("erp_production_orders")
        .update({ status: "done", actual_finish_at: new Date().toISOString() })
        .eq("id", parsed.production_order_id);
    }

    return NextResponse.json(act, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
