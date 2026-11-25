import { getTranslations } from "next-intl/server";
import { Section, SectionHeader } from "@udo-craft/ui";
import { getAllImages, resolveProductImages } from "@udo-craft/shared/product-images";
import { localizedField } from "@/lib/localized-field";
import { DemoIsland, type DemoItem, type DemoVariant } from "./DemoIsland";
import type { HomeCtx } from "./context";

const front = (images: ReturnType<typeof resolveProductImages>) => {
  const map = getAllImages(images);
  return map.front ?? Object.values(map)[0] ?? null;
};

type Product = HomeCtx["products"][number];

/** Colour variants of a product that have a front image and a known material. */
function variantsOf(ctx: HomeCtx, product: Product): DemoVariant[] {
  const out: DemoVariant[] = [];
  for (const v of ctx.colorVariants) {
    if (v.product_id !== product.id) continue;
    const image = front(resolveProductImages(v.variant_images, v.images));
    const material = ctx.materials.find((m) => m.id === v.material_id);
    if (image && material) out.push({ id: v.id, name: material.name, hex: material.hex_code, image });
  }
  return out.slice(0, 8);
}

const MAX_ITEMS = 8;

/**
 * Products for the try-on: active products flagged «Бестселер» in admin. With none
 * flagged, the products with the most colours (the old automatic pick). Products
 * without any usable image are skipped.
 */
function pickItems(ctx: HomeCtx): { product: Product; variants: DemoVariant[]; fallback: string | null }[] {
  const active = ctx.products.filter((p) => p.is_active);
  const flagged = active.filter((p) => (p as Product & { is_bestseller?: boolean }).is_bestseller);
  const candidates = (flagged.length ? flagged : active).map((product) => ({
    product,
    variants: variantsOf(ctx, product),
    fallback: front(resolveProductImages(product.product_images, product.images)),
  }));
  const usable = candidates.filter((c) => c.variants.length > 0 || c.fallback);
  if (!flagged.length) usable.sort((x, y) => y.variants.length - x.variants.length);
  return usable.slice(0, MAX_ITEMS);
}

export async function LiveDemo({ ctx }: { ctx: HomeCtx }) {
  const { locale } = ctx;
  const [t, tDemo, tCollections] = await Promise.all([
    getTranslations({ locale, namespace: "customizer" }),
    getTranslations({ locale, namespace: "homeDemo" }),
    getTranslations({ locale, namespace: "collections" }),
  ]);
  const items: DemoItem[] = pickItems(ctx).map(({ product, variants, fallback }) => ({
    id: product.id,
    slug: product.slug || product.id,
    name: localizedField(product.name, product.name_en, locale),
    priceLabel: product.base_price_cents > 0 ? tCollections("fromPrice", { price: Math.round(product.base_price_cents / 100) }) : null,
    variants,
    fallbackImage: fallback,
  }));

  return (
    <Section id="demo" tone="inverse" aria-labelledby="demo-heading">
      <SectionHeader titleId="demo-heading" title={tDemo("heading")} lede={t("desc")} align="center" />
      <DemoIsland
        items={items}
        labels={{
          color: t("colorLabel"),
          upload: tDemo("upload"),
          remove: tDemo("remove"),
          hint: tDemo("hint"),
          note: tDemo("note"),
          tooLarge: tDemo("tooLarge"),
          editor: t("openEditor"),
          prev: tDemo("prev"),
          next: tDemo("next"),
        }}
      />
    </Section>
  );
}
