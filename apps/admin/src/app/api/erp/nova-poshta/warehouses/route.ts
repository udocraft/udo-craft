import { NextRequest, NextResponse } from "next/server";
import { apiError, requireErpUser } from "../../_lib";

export async function GET(req: NextRequest) {
  const { service, error } = await requireErpUser();
  if (error) return error;

  // Try settings first, fall back to env
  const { data: settingsData } = await service!.from("app_settings").select("value").eq("key", "nova_poshta").single();
  const apiKey = settingsData?.value?.api_key || process.env.NOVA_POSHTA_API_KEY;
  
  const city = new URL(req.url).searchParams.get("city") || "";
  if (!apiKey) {
    return NextResponse.json({ configured: false, data: [], error: "NOVA_POSHTA_API_KEY is not configured" });
  }

  try {
    const res = await fetch("https://api.novaposhta.ua/v2.0/json/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        modelName: "Address",
        calledMethod: "getWarehouses",
        methodProperties: {
          CityName: city,
          Limit: "50",
          Page: "1",
        },
      }),
    });
    const json = await res.json();
    return NextResponse.json({ configured: true, data: json.data ?? [], raw: json });
  } catch (err) {
    return apiError(err, 502);
  }
}
