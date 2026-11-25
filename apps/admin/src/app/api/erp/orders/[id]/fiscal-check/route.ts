import { requireAdminPermission } from "@/lib/authz/guard";
import { NextResponse } from "next/server";
import { apiError, requireErpUser } from "../../../_lib";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const authz = await requireAdminPermission("erp.manage");
  if (!authz.ok) return authz.response;
  const { service, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const token = process.env.CHECKBOX_API_TOKEN;
    if (!token) return NextResponse.json({ error: "CHECKBOX_API_TOKEN is not configured" }, { status: 400 });

    const { data: lead, error: leadError } = await service!
      .from("leads")
      .select("id, customer_data, total_amount_cents, payment_status, order_items!order_items_lead_id_fkey(*)")
      .eq("id", params.id)
      .single();
    if (leadError) return apiError(leadError);

    // A line is (garment after discount + print) x quantity, the same rule that
    // produced total_amount_cents (packages/shared/src/orders.ts).
    const goods = (lead.order_items ?? []).map((item: any) => {
      const unit = Number(item.unit_price_cents ?? item.technical_metadata?.unit_price_cents ?? 0);
      const print = Number(item.print_cost_cents ?? item.technical_metadata?.print_cost_cents ?? 0);
      return {
        name: [item.color, item.size].filter(Boolean).join(" / ") || "Товар",
        quantity: item.quantity,
        sum_cents: Math.round((unit + print) * item.quantity),
      };
    });
    const goodsTotal = goods.reduce((sum: number, g: { sum_cents: number }) => sum + g.sum_cents, 0);

    const draft = {
      status: "draft_ready",
      provider: "checkbox",
      payment_status: lead.payment_status,
      total_cents: lead.total_amount_cents,
      goods,
      // Orders saved before prices were unified can disagree; flag it rather than hide it.
      totals_mismatch_cents: goodsTotal - (lead.total_amount_cents ?? 0),
      created_at: new Date().toISOString(),
      message: "Дані чека підготовлені. Для бойової фіскалізації потрібно додати касу/касира і точні мапінги Checkbox.",
    };

    const { data, error: updateError } = await service!
      .from("leads")
      .update({ fiscal_data: draft })
      .eq("id", params.id)
      .select("fiscal_data")
      .single();
    if (updateError) return apiError(updateError);
    return NextResponse.json(data.fiscal_data);
  } catch (err) {
    return apiError(err, 400);
  }
}
