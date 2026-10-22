import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../_lib";

const SupplierPayload = z.object({
  name: z.string().min(1),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  tax_id: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  is_active: z.boolean().default(true),
});

export async function GET() {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { data, error: dbError } = await service!
    .from("erp_suppliers")
    .select("*")
    .order("name", { ascending: true });
  if (dbError) return apiError(dbError);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { service, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = SupplierPayload.parse(await req.json());
    const { data, error: dbError } = await service!
      .from("erp_suppliers")
      .insert(parsed)
      .select()
      .single();
    if (dbError) return apiError(dbError);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
