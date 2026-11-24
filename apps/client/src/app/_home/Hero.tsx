import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { Link } from "@/i18n/navigation";
import { HeroMedia } from "./HeroMedia";
import type { HomeCtx } from "./context";

/**
 * B2C home hero: one message, one primary action, one quiet link. Copy comes from
 * translations (the admin CMS `home_hero` block holds the B2B copy and drives /biz).
 */
export async function Hero({ ctx }: { ctx: HomeCtx }) {
  const [t, tHero, tNav] = await Promise.all([
    getTranslations({ locale: ctx.locale, namespace: "home" }),
    getTranslations({ locale: ctx.locale, namespace: "hero" }),
    getTranslations({ locale: ctx.locale, namespace: "nav" }),
  ]);

  return (
    <section className="inverse relative overflow-hidden bg-background text-foreground" aria-label={tHero("mainSection")}>
      <HeroMedia />
      <div className="relative mx-auto flex min-h-[78svh] w-full max-w-4xl flex-col items-center justify-center px-gutter pb-24 pt-40 text-center md:min-h-[44rem]">
        <h1 className="text-display font-semibold text-balance">{t("hero.heading")}</h1>
        <p className="mt-6 max-w-2xl text-lede text-muted-foreground text-pretty">{t("hero.subheading")}</p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <Link href="/order" prefetch={false} className={buttonVariants({ variant: "primary", size: "lg" })}>
            {tNav("createDesign")}
          </Link>
          <a
            href="#catalog"
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-control text-base font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {tHero("ctaPrimary")}
            <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
