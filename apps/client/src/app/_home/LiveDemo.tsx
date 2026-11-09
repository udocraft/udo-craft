import { getTranslations } from "next-intl/server";
import { Section, SectionHeader } from "@udo-craft/ui";
import { getAllImages, resolveProductImages } from "@udo-craft/shared/product-images";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized-field";
import { DemoIsland, type DemoVariant } from "./DemoIsland";
import type { HomeCtx } from "./context";

const front = (images: ReturnType<typeof resolveProductImages>) => {
  const map = getAllImages(images);
  return map.front ?? Object.values(map)[0] ?? null;
};

function pickDemo(ctx: HomeCtx) {
  let best: { product: HomeCtx["products"][number]; variants: DemoVariant[] } | null = null;
  for (const product of ctx.products) {
    if (!product.is_active) continue;
    const variants: DemoVariant[] = [];
    for (const v of ctx.colorVariants) {
      if (v.product_id !== product.id) continue;
      const image = front(resolveProductImages(v.variant_images, v.images));
      const material = ctx.materials.find((m) => m.id === v.material_id);
      if (image && material) variants.push({ id: v.id, name: material.name, hex: material.hex_code, image });
    }
    if (variants.length > (best?.variants.length ?? 0)) best = { product, variants: variants.slice(0, 8) };
  }
  if (best) return { product: best.product, variants: best.variants, fallback: null as string | null };
  const product = ctx.products.find((p) => p.is_active && front(resolveProductImages(p.product_images, p.images))) ?? null;
  return {
    product,
    variants: [] as DemoVariant[],
    fallback: product ? front(resolveProductImages(product.product_images, product.images)) : null,
  };
}

export async function LiveDemo({ ctx }: { ctx: HomeCtx }) {
  const { locale } = ctx;
  const [t, tDemo, tDesigner, tCollections] = await Promise.all([
    getTranslations({ locale, namespace: "customizer" }),
    getTranslations({ locale, namespace: "homeDemo" }),
    getTranslations({ locale, namespace: "designer" }),
    getTranslations({ locale, namespace: "collections" }),
  ]);
  const { product, variants, fallback } = pickDemo(ctx);
  const name = product ? localizedField(product.name, product.name_en, locale) : null;
  const price = product && product.base_price_cents > 0 ? tCollections("fromPrice", { price: Math.round(product.base_price_cents / 100) }) : null;

  return (
    <Section id="demo" tone="inverse" aria-labelledby="demo-heading">
      <SectionHeader titleId="demo-heading" title={t("heading")} lede={t("desc")} />
      <DemoIsland
        variants={variants}
        fallbackImage={fallback}
        productName={name}
        priceLabel={price}
        orderHref={product ? `/order?product=${encodeURIComponent(product.slug || product.id)}` : "/order"}
        labels={{
          color: t("colorLabel"),
          upload: tDemo("upload"),
          remove: tDemo("remove"),
          hint: tDemo("hint"),
          note: tDemo("note"),
          tooLarge: tDemo("tooLarge"),
          editor: t("openEditor"),
        }}
      >
        <div className="mt-10 border-t border-border pt-6">
          <h3 className="text-h4 font-semibold">{tDesigner("heading")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{tDesigner("desc")}</p>
          <Link
            href="/?ref=designer#contact"
            className="mt-2 inline-flex min-h-11 items-center rounded-control text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {tDesigner("cta")}
          </Link>
        </div>
      </DemoIsland>
    </Section>
  );
}
