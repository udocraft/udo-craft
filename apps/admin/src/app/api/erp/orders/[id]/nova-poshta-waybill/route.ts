import { NextResponse } from "next/server";
import { apiError, requireErpUser } from "../../../_lib";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { service, error } = await requireErpUser();
  if (error) return error;
  try {
    // Get NovaPoshta settings (api_key + sender refs)
    const { data: settingsData } = await service!.from("app_settings").select("value").eq("key", "nova_poshta").single();
    const npSettings = settingsData?.value || {};
    const apiKey = npSettings.api_key || process.env.NOVA_POSHTA_API_KEY;
    
    if (!apiKey) return NextResponse.json({ error: "NOVA_POSHTA_API_KEY is not configured" }, { status: 400 });

    const { data: lead, error: leadError } = await service!
      .from("leads")
      .select("id, customer_data, total_amount_cents, nova_poshta_data")
      .eq("id", params.id)
      .single();
    if (leadError) return apiError(leadError);

    const draft = {
      status: "draft_ready",
      provider: "nova_poshta",
      recipient: lead.customer_data,
      cod_cents: lead.total_amount_cents,
      sender_ref: npSettings.sender_ref || null,
      sender_contact_ref: npSettings.sender_contact_ref || null,
      sender_address_ref: npSettings.sender_address_ref || null,
      created_at: new Date().toISOString(),
      message: npSettings.sender_ref && npSettings.sender_contact_ref && npSettings.sender_address_ref
        ? "Дані підготовані з налаштувань відправника."
        : "Дані підготовані. Для створення ТТН додайте sender refs у налаштуваннях НоваПошта.",
    };

    const { data, error: updateError } = await service!
      .from("leads")
      .update({ nova_poshta_data: { ...(lead.nova_poshta_data ?? {}), waybill: draft } })
      .eq("id", params.id)
      .select("nova_poshta_data")
      .single();
    if (updateError) return apiError(updateError);
    return NextResponse.json(data.nova_poshta_data);
  } catch (err) {
    return apiError(err, 400);
  }
}
