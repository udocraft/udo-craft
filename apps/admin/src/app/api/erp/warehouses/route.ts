import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../_lib";

const WarehousePayload = z.object({
  name: z.string().min(1),
  code: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export async function GET() {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { data, error: dbError } = await service!
    .from("erp_warehouses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (dbError) return apiError(dbError);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { service, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = WarehousePayload.parse(await req.json());
    const { data, error: dbError } = await service!
      .from("erp_warehouses")
      .insert(parsed)
      .select()
      .single();
    if (dbError) return apiError(dbError);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
