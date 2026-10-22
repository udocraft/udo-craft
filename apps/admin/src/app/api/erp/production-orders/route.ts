import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../_lib";

const ProductionLine = z.object({
  variant_sku_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().int().positive(),
  due_date: z.string().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
});

const ProductionPayload = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  planned_start_at: z.string().nullable().optional(),
  planned_finish_at: z.string().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  lines: z.array(ProductionLine).min(1),
});

async function buildRequirements(service: any, line: z.infer<typeof ProductionLine>) {
  if (line.variant_sku_id) {
    const { data } = await service
      .from("product_variant_recipe_lines")
      .select("erp_material_id, role, quantity, production_step, material:erp_materials(id,name,unit,stock_quantity,reserved_quantity,unit_cost_cents)")
      .eq("variant_sku_id", line.variant_sku_id)
      .order("sort_order", { ascending: true });
    return (data ?? []).map((row: any) => {
      const required = Number(row.quantity || 0) * line.quantity;
      const available = Number(row.material?.stock_quantity || 0) - Number(row.material?.reserved_quantity || 0);
      return { ...row, required_quantity: required, available_quantity: available, shortage_quantity: Math.max(0, required - available) };
    });
  }

  if (line.product_id) {
    const { data } = await service
      .from("product_recipe_lines")
      .select("erp_material_id, role, quantity, production_step, material:erp_materials(id,name,unit,stock_quantity,reserved_quantity,unit_cost_cents)")
      .eq("product_id", line.product_id)
      .order("sort_order", { ascending: true });
    return (data ?? []).map((row: any) => {
      const required = Number(row.quantity || 0) * line.quantity;
      const available = Number(row.material?.stock_quantity || 0) - Number(row.material?.reserved_quantity || 0);
      return { ...row, required_quantity: required, available_quantity: available, shortage_quantity: Math.max(0, required - available) };
    });
  }

  return [];
}

export async function GET() {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { data, error: dbError } = await service!
    .from("erp_production_orders")
    .select("*, lines:erp_production_order_lines(*, variant_sku:product_variant_skus(*), product:products(id,name,slug))")
    .order("created_at", { ascending: false })
    .limit(80);
  if (dbError) return apiError(dbError);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { service, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = ProductionPayload.parse(await req.json());
    const { data: order, error: orderError } = await service!
      .from("erp_production_orders")
      .insert({
        lead_id: parsed.lead_id,
        product_id: parsed.lines[0]?.product_id ?? null,
        quantity: parsed.lines.reduce((sum, line) => sum + line.quantity, 0),
        status: "planned",
        planned_start_at: parsed.planned_start_at,
        planned_finish_at: parsed.planned_finish_at,
        notes: parsed.notes,
      })
      .select()
      .single();
    if (orderError) return apiError(orderError);

    const lineRows = [];
    for (let index = 0; index < parsed.lines.length; index++) {
      const line = parsed.lines[index];
      lineRows.push({
        ...line,
        production_order_id: order.id,
        material_requirements: await buildRequirements(service!, line),
        sort_order: index,
      });
    }
    const { error: linesError } = await service!.from("erp_production_order_lines").insert(lineRows);
    if (linesError) return apiError(linesError);

    const { data, error: reloadError } = await service!
      .from("erp_production_orders")
      .select("*, lines:erp_production_order_lines(*, variant_sku:product_variant_skus(*), product:products(id,name,slug))")
      .eq("id", order.id)
      .single();
    if (reloadError) return apiError(reloadError);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
