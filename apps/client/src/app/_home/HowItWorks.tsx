import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";

const STEPS = [
  { n: "1", href: "#catalog" },
  { n: "2", href: "/order" },
  { n: "3", href: "#contact" },
  { n: "4", href: "#faq" },
] as const;

export async function HowItWorks({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "process" });
  return (
    <Section id="how" aria-labelledby="how-heading">
      <SectionHeader titleId="how-heading" title={t("heading")} lede={t("subtext")} />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("stepsLabel")}>
        {STEPS.map(({ n, href }) => (
          <li key={n} className="flex flex-col rounded-card border border-border bg-card p-6">
            <span className="text-sm font-semibold tabular-nums text-brand">{n}</span>
            <h3 className="mt-3 text-h3 font-semibold">{t(`steps.${n}.title`)}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{t(`steps.${n}.body`)}</p>
            <p className="mt-5 text-sm text-muted-foreground">
              {t("estimatedTime")}: <span className="font-medium text-foreground">{t(`steps.${n}.time`)}</span>
            </p>
            <Link
              href={href}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t(`steps.${n}.cta`)} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </Section>
  );
}
