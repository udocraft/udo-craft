import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Section } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";

/** One quiet line pointing companies to /biz. No B2B offers on the shopper home. */
export async function BizBand({ locale }: { locale: string }) {
  const [t, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "home.biz" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  return (
    <Section aria-labelledby="biz-band-heading" className="py-16 md:py-20">
      <div className="flex flex-col items-start justify-between gap-6 border-t border-border pt-10 md:flex-row md:items-center">
        <div>
          <h2 id="biz-band-heading" className="text-h3 font-semibold">{t("heading")}</h2>
          <p className="mt-1 text-muted-foreground">{t("text")}</p>
        </div>
        <Link
          href="/biz"
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tNav("business")}
          <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}
