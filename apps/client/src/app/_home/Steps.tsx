import { getTranslations } from "next-intl/server";
import { Section, SectionHeader } from "@udo-craft/ui";
import { StepsProgress } from "./StepsProgress";

const STEPS = ["0", "1", "2"] as const;

/** B2C "how it works": three short steps whose lines fill in sequence. No time estimates or quote talk. */
export async function Steps({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "home.steps" });
  return (
    <Section id="how" aria-labelledby="how-heading">
      <SectionHeader titleId="how-heading" title={t("heading")} />
      <StepsProgress items={STEPS.map((n) => ({ title: t(`items.${n}.title`), desc: t(`items.${n}.desc`) }))} />
    </Section>
  );
}
