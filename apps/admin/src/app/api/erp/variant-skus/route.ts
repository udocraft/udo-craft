import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../_lib";

const VariantSkuPayload = z.object({
  product_id: z.string().uuid(),
  color_variant_id: z.string().uuid().nullable().optional(),
  color_name: z.string().trim().nullable().optional(),
  size: z.string().min(1),
  sku: z.string().trim().optional(),
  sewing_cost_cents: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
  copy_from_variant_sku_id: z.string().uuid().nullable().optional(),
});

function makeSku(productSlug: string | null | undefined, color: string | null | undefined, size: string) {
  const base = (productSlug || "PRD").replace(/[^a-z0-9]+/gi, "").slice(0, 8).toUpperCase() || "PRD";
  const colorPart = (color || "STD").replace(/[^a-z0-9а-яіїєґ]+/gi, "").slice(0, 4).toUpperCase() || "STD";
  return `${base}-${colorPart}-${size.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function GET(req: NextRequest) {
  const { service, error } = await requireErpUser();
  if (error) return error;
  const productId = new URL(req.url).searchParams.get("product_id");
  let query = service!
    .from("product_variant_skus")
    .select("*, product:products(id,name,slug), color_variant:product_color_variants(*), recipe:product_variant_recipe_lines(*, material:erp_materials(*))")
    .order("sort_order", { ascending: true })
    .order("size", { ascending: true });
  if (productId) query = query.eq("product_id", productId);
  const { data, error: dbError } = await query;
  if (dbError) return apiError(dbError);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { service, error } = await requireErpUser("erp.manage");
  if (error) return error;
  try {
    const parsed = VariantSkuPayload.parse(await req.json());
    const { data: product } = await service!
      .from("products")
      .select("slug")
      .eq("id", parsed.product_id)
      .single();
    const sku = parsed.sku?.trim() || makeSku(product?.slug, parsed.color_name, parsed.size);
    const { copy_from_variant_sku_id, ...row } = parsed;
    const { data, error: dbError } = await service!
      .from("product_variant_skus")
      .insert({ ...row, sku })
      .select()
      .single();
    if (dbError) return apiError(dbError);

    if (copy_from_variant_sku_id) {
      const { data: recipe } = await service!
        .from("product_variant_recipe_lines")
        .select("erp_material_id, role, quantity, production_step, sort_order")
        .eq("variant_sku_id", copy_from_variant_sku_id);
      if (recipe?.length) {
        await service!.from("product_variant_recipe_lines").insert(
          recipe.map((line) => ({ ...line, variant_sku_id: data.id }))
        );
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return apiError(err, 400);
  }
}
