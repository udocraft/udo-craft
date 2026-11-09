// Zod-free image helpers. Client components import these from
// "@udo-craft/shared/product-images" so zod (the schemas in index.ts) stays out
// of the browser bundle. index.ts re-exports them, so existing imports still work.

export interface ProductImage {
  key: string;
  url: string;
  label: string;
  is_customizable: boolean;
  sort_order: number;
}

/**
 * Returns only customizable images as a legacy { key: url } map.
 * Drop-in replacement for reading product.images in canvas code.
 */
export function getCustomizableImages(imgs: ProductImage[]): Record<string, string> {
  return Object.fromEntries(
    imgs
      .filter((i) => i.is_customizable && i.url)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => [i.key, i.url])
  );
}

/**
 * Returns all images (customizable + gallery) as a { key: url } map.
 */
export function getAllImages(imgs: ProductImage[]): Record<string, string> {
  return Object.fromEntries(
    imgs
      .filter((i) => i.url)
      .sort((a, b) => {
        // Non-customizable first, then by sort_order
        if (a.is_customizable !== b.is_customizable) return a.is_customizable ? 1 : -1;
        return a.sort_order - b.sort_order;
      })
      .map((i) => [i.key, i.url])
  );
}

/**
 * Reads new product_images/variant_images column with fallback to legacy images Record.
 * Use this everywhere instead of reading .images directly.
 */
export function resolveProductImages(
  productImages: ProductImage[] | undefined | null,
  legacyImages: Record<string, string> | undefined | null
): ProductImage[] {
  if (productImages && productImages.length > 0) return productImages;
  // Convert legacy Record to ProductImage array, all marked customizable
  return Object.entries(legacyImages ?? {}).map(([key, url], i) => ({
    key,
    url,
    label: key,
    is_customizable: true,
    sort_order: i,
  }));
}
