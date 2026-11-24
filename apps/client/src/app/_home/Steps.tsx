import { getTranslations } from "next-intl/server";
import { Section, SectionHeader } from "@udo-craft/ui";

const STEPS = ["0", "1", "2"] as const;

/** B2C "how it works": three short steps, no time estimates or quote talk. */
export async function Steps({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home.steps" });
  return (
    <Section id="how" aria-labelledby="how-heading">
      <SectionHeader titleId="how-heading" title={t("heading")} />
      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map((n) => (
          <li key={n} className="border-t border-border pt-6">
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">0{Number(n) + 1}</span>
            <h3 className="mt-3 text-h3 font-semibold">{t(`items.${n}.title`)}</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">{t(`items.${n}.desc`)}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
