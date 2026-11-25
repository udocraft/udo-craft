import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addFinishedGoods, adjustMaterialStock, apiError, requireErpUser } from "../_lib";
import { syncLeadFromWorkflow } from "@/lib/leads/server";

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
      // Consume materials and add finished goods with atomic updates, then record
      // all stock movements in one insert.
      const requirements = (order.lines ?? []).flatMap((line: any) =>
        (line.material_requirements ?? [])
          .map((req: any) => ({ materialId: req.erp_material_id as string, qty: Number(req.required_quantity || 0) }))
          .filter((r: { materialId: string; qty: number }) => r.materialId && r.qty > 0),
      ) as { materialId: string; qty: number }[];
      const materialIds = [...new Set(requirements.map((r) => r.materialId))];
      const { data: materials, error: materialsError } = materialIds.length
        ? await service!.from("erp_materials").select("id, unit_cost_cents").in("id", materialIds)
        : { data: [], error: null };
      if (materialsError) return apiError(materialsError);
      const costById = new Map((materials ?? []).map((m) => [m.id as string, Number(m.unit_cost_cents || 0)]));

      try {
        for (const req of requirements) {
          await adjustMaterialStock(service!, req.materialId, -req.qty);
        }
        for (const line of order.lines ?? []) {
          if (line.variant_sku_id) {
            await addFinishedGoods(service!, line.variant_sku_id, parsed.warehouse_id ?? null, Number(line.quantity || 0));
          }
        }
      } catch (err) {
        return apiError(err);
      }

      if (requirements.length) {
        const { error: movementsError } = await service!.from("erp_stock_movements").insert(
          requirements.map((req) => ({
            erp_material_id: req.materialId,
            production_order_id: parsed.production_order_id,
            processing_act_id: act.id,
            warehouse_id: parsed.warehouse_id,
            movement_type: "production_consume",
            quantity: -req.qty,
            unit_cost_cents: costById.get(req.materialId) ?? 0,
            note: parsed.comment,
            created_by: user!.id,
          })),
        );
        if (movementsError) return apiError(movementsError);
      }

      const { error: doneError } = await service!
        .from("erp_production_orders")
        .update({ status: "done", actual_finish_at: new Date().toISOString() })
        .eq("id", parsed.production_order_id);
      if (doneError) return apiError(doneError);

      // Tell the linked order. When every production document for it is finished
      // the order gets a note; the status is left to staff, because "completed"
      // counts as paid revenue in analytics and production done is not payment.
      if (order.lead_id) {
        const { data: open } = await service!
          .from("erp_production_orders")
          .select("id")
          .eq("lead_id", order.lead_id)
          .not("status", "in", "(done,cancelled)");
        const docNo = `#${String(parsed.production_order_id).slice(0, 8).toUpperCase()}`;
        await syncLeadFromWorkflow(service!, order.lead_id, {
          note: open && open.length === 0
            ? `Виробництво завершено (акт пошиття, документ ${docNo}). Замовлення готове до відвантаження`
            : `Проведено акт пошиття за документом ${docNo}`,
          actorEmail: user?.email,
        });
      }
    }

    return NextResponse.json(act, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
