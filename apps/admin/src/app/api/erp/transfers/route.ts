import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../_lib";

const TransferLine = z.object({
  erp_material_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).default("шт."),
  comment: z.string().trim().nullable().optional(),
});

const TransferPayload = z.object({
  from_warehouse_id: z.string().uuid().nullable().optional(),
  to_warehouse_id: z.string().uuid().nullable().optional(),
  comment: z.string().trim().nullable().optional(),
  post: z.boolean().default(true),
  lines: z.array(TransferLine).min(1),
});

export async function GET() {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { data, error: dbError } = await service!
    .from("erp_stock_transfers")
    .select("*, from_warehouse:erp_warehouses!erp_stock_transfers_from_warehouse_id_fkey(*), to_warehouse:erp_warehouses!erp_stock_transfers_to_warehouse_id_fkey(*), lines:erp_stock_transfer_lines(*, material:erp_materials(*))")
    .order("created_at", { ascending: false })
    .limit(80);
  if (dbError) return apiError(dbError);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { service, user, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = TransferPayload.parse(await req.json());
    if (parsed.from_warehouse_id && parsed.from_warehouse_id === parsed.to_warehouse_id) {
      return NextResponse.json({ error: "Склади переміщення мають відрізнятися" }, { status: 400 });
    }
    const { data: transfer, error: transferError } = await service!
      .from("erp_stock_transfers")
      .insert({
        from_warehouse_id: parsed.from_warehouse_id,
        to_warehouse_id: parsed.to_warehouse_id,
        comment: parsed.comment,
        status: parsed.post ? "posted" : "draft",
        posted_at: parsed.post ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (transferError) return apiError(transferError);

    const lines = parsed.lines.map((line, index) => ({ ...line, transfer_id: transfer.id, sort_order: index }));
    const { error: linesError } = await service!.from("erp_stock_transfer_lines").insert(lines);
    if (linesError) return apiError(linesError);

    if (parsed.post) {
      for (const line of lines) {
        const { data: material } = await service!
          .from("erp_materials")
          .select("unit_cost_cents")
          .eq("id", line.erp_material_id)
          .single();
        await service!.from("erp_stock_movements").insert([
          {
            erp_material_id: line.erp_material_id,
            transfer_id: transfer.id,
            warehouse_id: parsed.from_warehouse_id,
            movement_type: "transfer_out",
            quantity: -line.quantity,
            unit_cost_cents: Number(material?.unit_cost_cents || 0),
            note: parsed.comment,
            created_by: user!.id,
          },
          {
            erp_material_id: line.erp_material_id,
            transfer_id: transfer.id,
            warehouse_id: parsed.to_warehouse_id,
            movement_type: "transfer_in",
            quantity: line.quantity,
            unit_cost_cents: Number(material?.unit_cost_cents || 0),
            note: parsed.comment,
            created_by: user!.id,
          },
        ]);
      }
    }

    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
