import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { Link } from "@/i18n/navigation";
import { HeroMedia } from "./HeroMedia";
import { cmsAttrs, cmsText, cmsValue, type HomeCtx } from "./context";

/**
 * /biz hero: the B2B headline (admin CMS `home_hero`, uk only), the configurator and
 * quote actions, and the client stat. Text only, over the muted brand video loop.
 */
export async function BizHero({ ctx }: { ctx: HomeCtx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "hero" });
  const tNav = await getTranslations({ locale: ctx.locale, namespace: "nav" });
  const tStats = await getTranslations({ locale: ctx.locale, namespace: "homeStats" });

  const primaryText = cmsText(ctx, "home_hero", "cta_primary_text", tNav("designMerch"));
  const primaryUrl = ctx.locale === "uk" ? cmsValue(ctx, "home_hero", "cta_primary_url", "/order") : "/order";
  const primaryIsRoute = primaryUrl.startsWith("/") && !primaryUrl.startsWith("//");

  const statValue = cmsValue(ctx, "home_stats", "stat1_value", "500");
  const statSuffix = cmsValue(ctx, "home_stats", "stat1_suffix", "+");
  const statLabel = cmsText(ctx, "home_stats", "stat1_label", tStats("stat1Label"));

  return (
    <section className="inverse relative overflow-hidden bg-background text-foreground" aria-label={t("mainSection")}>
      <HeroMedia />

      <div className="relative mx-auto grid w-full max-w-6xl items-center px-gutter pb-20 pt-36 lg:min-h-[40rem] lg:py-36">
        <div className="max-w-3xl">
          <h1 className="text-display font-semibold text-balance" {...cmsAttrs(ctx, "home_hero", "heading")}>
            {cmsText(ctx, "home_hero", "heading", t("heading"))}
          </h1>
          <p className="mt-6 max-w-xl text-lede text-muted-foreground" {...cmsAttrs(ctx, "home_hero", "subheading")}>
            {cmsText(ctx, "home_hero", "subheading", t("subheading"))}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {primaryIsRoute ? (
              <Link href={primaryUrl} prefetch={false} className={buttonVariants({ variant: "primary", size: "lg" })}>
                {primaryText}
              </Link>
            ) : (
              <a href={primaryUrl} className={buttonVariants({ variant: "primary", size: "lg" })}>
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

      </div>
    </section>
  );
}
