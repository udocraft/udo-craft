import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { getAllImages, resolveProductImages } from "@udo-craft/shared/product-images";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized-field";
import { HeroMedia } from "./HeroMedia";
import { cmsAttrs, cmsText, cmsValue, type HomeCtx } from "./context";

function pickHeroProduct(ctx: HomeCtx) {
  const imagesOf = (p: HomeCtx["products"][number]) => resolveProductImages(p.product_images, p.images);
  const product = ctx.products.find(
    (p) =>
      p.is_active &&
      (imagesOf(p).length > 0 ||
        ctx.colorVariants.some(
          (v) => v.product_id === p.id && resolveProductImages(v.variant_images, v.images).length > 0,
        )),
  );
  if (!product) return { product: null, image: null as string | null };
  const variant = ctx.colorVariants.find(
    (v) => v.product_id === product.id && resolveProductImages(v.variant_images, v.images).length > 0,
  );
  const images = variant ? resolveProductImages(variant.variant_images, variant.images) : imagesOf(product);
  const map = getAllImages(images);
  return { product, image: map.front ?? Object.values(map)[0] ?? null };
}

export async function Hero({ ctx }: { ctx: HomeCtx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "hero" });
  const tNav = await getTranslations({ locale: ctx.locale, namespace: "nav" });
  const tStats = await getTranslations({ locale: ctx.locale, namespace: "homeStats" });
  const { product, image } = pickHeroProduct(ctx);
  const productName = product ? localizedField(product.name, product.name_en, ctx.locale) : null;

  const primaryText = cmsText(ctx, "home_hero", "cta_primary_text", tNav("designMerch"));
  const primaryUrl = ctx.locale === "uk" ? cmsValue(ctx, "home_hero", "cta_primary_url", "/order") : "/order";
  const primaryIsRoute = primaryUrl.startsWith("/") && !primaryUrl.startsWith("//");

  const statValue = cmsValue(ctx, "home_stats", "stat1_value", "500");
  const statSuffix = cmsValue(ctx, "home_stats", "stat1_suffix", "+");
  const statLabel = cmsText(ctx, "home_stats", "stat1_label", tStats("stat1Label"));

  return (
    <section className="inverse relative overflow-hidden bg-background text-foreground" aria-label={t("mainSection")}>
      <HeroMedia />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-gutter pb-20 pt-32 lg:min-h-[44rem] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-36">
        <div className="max-w-2xl">
          <h1 className="text-display font-semibold text-balance" {...cmsAttrs(ctx, "home_hero", "heading")}>
            {cmsText(ctx, "home_hero", "heading", t("heading"))}
          </h1>
          <p className="mt-6 max-w-xl text-lede text-muted-foreground" {...cmsAttrs(ctx, "home_hero", "subheading")}>
            {cmsText(ctx, "home_hero", "subheading", t("subheading"))}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {primaryIsRoute ? (
              <Link href={primaryUrl} className={buttonVariants({ variant: "primary", size: "lg", className: "shadow-glow" })}>
                {primaryText}
              </Link>
            ) : (
              <a href={primaryUrl} className={buttonVariants({ variant: "primary", size: "lg", className: "shadow-glow" })}>
                {primaryText}
              </a>
            )}
            <a href="#contact" className={buttonVariants({ variant: "outline", size: "lg" })}>
              {tNav("getQuote")}
            </a>
          </div>

          <p className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-foreground">
                {statValue}
                {statSuffix}
              </strong>{" "}
              {statLabel}
            </span>
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] lg:mx-0">
          <div className="relative aspect-square overflow-hidden rounded-media bg-white ring-1 ring-foreground/10">
            {image && (
              <Image
                src={image}
                alt={productName ?? ""}
                fill
                priority
                sizes="(min-width: 1024px) 34rem, 92vw"
                className="object-contain p-6 sm:p-10"
              />
            )}
            <p className="absolute inset-x-4 bottom-4 truncate rounded-card bg-ink px-4 py-3 text-sm text-foreground">
              {productName ?? "U:DO CRAFT"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
