import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../_lib";

const ReceiptLine = z.object({
  erp_material_id: z.string().uuid(),
  unit: z.string().min(1).default("шт."),
  quantity: z.coerce.number().positive(),
  unit_cost_cents: z.coerce.number().int().min(0).default(0),
  comment: z.string().trim().nullable().optional(),
});

const ReceiptPayload = z.object({
  supplier_id: z.string().uuid().nullable().optional(),
  warehouse_id: z.string().uuid().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
  post: z.boolean().default(true),
  lines: z.array(ReceiptLine).min(1),
});

export async function GET() {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { data, error: dbError } = await service!
    .from("erp_goods_receipts")
    .select("*, supplier:erp_suppliers(*), warehouse:erp_warehouses(*), lines:erp_goods_receipt_lines(*, material:erp_materials(*))")
    .order("created_at", { ascending: false })
    .limit(80);
  if (dbError) return apiError(dbError);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { service, user, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = ReceiptPayload.parse(await req.json());
    const total_cents = parsed.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unit_cost_cents), 0);
    const { data: receipt, error: receiptError } = await service!
      .from("erp_goods_receipts")
      .insert({
        supplier_id: parsed.supplier_id,
        warehouse_id: parsed.warehouse_id,
        comment: parsed.comment,
        status: parsed.post ? "posted" : "draft",
        total_cents,
        posted_at: parsed.post ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (receiptError) return apiError(receiptError);

    const lines = parsed.lines.map((line, index) => ({
      ...line,
      receipt_id: receipt.id,
      total_cents: Math.round(line.quantity * line.unit_cost_cents),
      sort_order: index,
    }));
    const { error: linesError } = await service!.from("erp_goods_receipt_lines").insert(lines);
    if (linesError) return apiError(linesError);

    if (parsed.post) {
      for (const line of lines) {
        const { data: material } = await service!
          .from("erp_materials")
          .select("stock_quantity")
          .eq("id", line.erp_material_id)
          .single();
        const nextQty = Number(material?.stock_quantity || 0) + Number(line.quantity);
        await service!
          .from("erp_materials")
          .update({ stock_quantity: nextQty, unit_cost_cents: line.unit_cost_cents })
          .eq("id", line.erp_material_id);
        await service!.from("erp_stock_movements").insert({
          erp_material_id: line.erp_material_id,
          receipt_id: receipt.id,
          warehouse_id: parsed.warehouse_id,
          movement_type: "receipt",
          quantity: line.quantity,
          unit_cost_cents: line.unit_cost_cents,
          note: parsed.comment,
          created_by: user!.id,
        });
      }
    }

    const { data, error: reloadError } = await service!
      .from("erp_goods_receipts")
      .select("*, supplier:erp_suppliers(*), warehouse:erp_warehouses(*), lines:erp_goods_receipt_lines(*, material:erp_materials(*))")
      .eq("id", receipt.id)
      .single();
    if (reloadError) return apiError(reloadError);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
