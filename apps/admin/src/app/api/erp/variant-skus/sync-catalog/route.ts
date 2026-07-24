import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireErpUser } from "../../_lib";

const SyncCatalogPayload = z.object({
  product_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const { service, error } = await requireErpUser();
  if (error) return error;

  try {
    const { product_id } = SyncCatalogPayload.parse(await req.json());

    // 1. Fetch all SKUs for the product with color_variant joins
    const { data: skus, error: skusError } = await service!
      .from("product_variant_skus")
      .select("*, color_variant:product_color_variants(*, material:erp_materials(*))")
      .eq("product_id", product_id)
      .order("sort_order", { ascending: true });

    if (skusError) return apiError(skusError);

    // 2. Fetch all color variants for the product with material joins
    const { data: colorVariants, error: colorVariantsError } = await service!
      .from("product_color_variants")
      .select("*, material:erp_materials(*)")
      .eq("product_id", product_id);

    if (colorVariantsError) return apiError(colorVariantsError);

    // Build a lookup map: color_variant_id -> material name
    const colorVariantMaterialName = new Map<string, string>();
    for (const cv of colorVariants ?? []) {
      const materialName: string | null = (cv.material as { name?: string } | null)?.name ?? null;
      if (materialName) {
        colorVariantMaterialName.set(cv.id, materialName);
      }
    }

    // 3. For each SKU that has color_variant_id set but color_name is null/empty,
    //    update color_name from the color variant's material name
    const toUpdate = (skus ?? []).filter(
      (sku) =>
        sku.color_variant_id &&
        (!sku.color_name || sku.color_name.trim() === "") &&
        colorVariantMaterialName.has(sku.color_variant_id)
    );

    let synced = 0;
    for (const sku of toUpdate) {
      const newColorName = colorVariantMaterialName.get(sku.color_variant_id!)!;
      const { error: updateError } = await service!
        .from("product_variant_skus")
        .update({ color_name: newColorName })
        .eq("id", sku.id);
      if (updateError) return apiError(updateError);
      synced++;
    }

    // 4. Fetch updated SKUs to return fresh data
    const { data: updatedSkus, error: refetchError } = await service!
      .from("product_variant_skus")
      .select("*, color_variant:product_color_variants(*, material:erp_materials(*))")
      .eq("product_id", product_id)
      .order("sort_order", { ascending: true });

    if (refetchError) return apiError(refetchError);

    return NextResponse.json({ synced, skus: updatedSkus ?? [] });
  } catch (err) {
    return apiError(err, 400);
  }
}
