import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../../_lib";

const OrderErpPayload = z.object({
  payment_status: z.enum(["unpaid", "partial", "paid", "refunded"]).optional(),
  payment_amount_cents: z.coerce.number().int().min(0).optional(),
  buyer_requisites: z.record(z.string(), z.unknown()).optional(),
  nova_poshta_data: z.record(z.string(), z.unknown()).optional(),
  fiscal_data: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { service, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = OrderErpPayload.parse(await req.json());
    const { data, error: dbError } = await service!
      .from("leads")
      .update(parsed)
      .eq("id", params.id)
      .select("*, order_items!order_items_lead_id_fkey(*)")
      .single();
    if (dbError) return apiError(dbError);
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err, 400);
  }
}
