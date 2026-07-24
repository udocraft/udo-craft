import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../../_lib";

const RecipeLine = z.object({
  erp_material_id: z.string().uuid(),
  role: z.string().min(1).default("material"),
  quantity: z.coerce.number().positive(),
  production_step: z.string().trim().nullable().optional(),
  sort_order: z.coerce.number().int().default(0),
});

const PatchPayload = z.object({
  size: z.string().min(1).optional(),
  sku: z.string().trim().optional(),
  color_name: z.string().trim().nullable().optional(),
  color_variant_id: z.string().uuid().nullable().optional(),
  sewing_cost_cents: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  recipe: z.array(RecipeLine).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { data, error: dbError } = await service!
    .from("product_variant_skus")
    .select(
      "*, product:products(id,name,slug), color_variant:product_color_variants(*), recipe:product_variant_recipe_lines(*, material:erp_materials(*))"
    )
    .eq("id", params.id)
    .single();
  if (dbError) return apiError(dbError, dbError.code === "PGRST116" ? 404 : 500);
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { service, error } = await requireErpUser();
  if (error) return error;
  try {
    const parsed = PatchPayload.parse(await req.json());
    const { recipe, ...patch } = parsed;
    const { data, error: dbError } = await service!
      .from("product_variant_skus")
      .update(patch)
      .eq("id", params.id)
      .select()
      .single();
    if (dbError) return apiError(dbError);

    if (recipe) {
      const { error: deleteError } = await service!
        .from("product_variant_recipe_lines")
        .delete()
        .eq("variant_sku_id", params.id);
      if (deleteError) return apiError(deleteError);
      if (recipe.length) {
        const { error: insertError } = await service!.from("product_variant_recipe_lines").insert(
          recipe.map((line, index) => ({ ...line, variant_sku_id: params.id, sort_order: line.sort_order || index }))
        );
        if (insertError) return apiError(insertError);
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    return apiError(err, 400);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const { error: dbError } = await service!.from("product_variant_skus").delete().eq("id", params.id);
  if (dbError) return apiError(dbError);
  return new NextResponse(null, { status: 204 });
}
