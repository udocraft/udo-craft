import { getTranslations } from "next-intl/server";
import { Minus, Plus } from "lucide-react";
import { Section } from "@udo-craft/ui";

/** B2C FAQ. Items come from getB2cFaqItems so the JSON-LD and the page stay identical. */
export async function HomeFaq({
  locale,
  items,
  telegram,
}: {
  locale: string;
  items: { question: string; answer: string }[];
  telegram: string;
}) {
  const t = await getTranslations({ locale, namespace: "faq" });
  return (
    <Section id="faq" tone="muted" aria-labelledby="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <div>
          <h2 id="faq-heading" className="text-h2 font-semibold text-balance">
            {t("heading")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("noAnswer")}{" "}
            <a href={telegram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              {t("contactUs")}
            </a>
            {t("replyTime")}
          </p>
        </div>
        <div className="border-t border-border">
          {items.map((item, i) => (
            <details key={i} className="group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-semibold marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground" aria-hidden="true">
                  <Plus className="size-4 group-open:hidden" />
                  <Minus className="hidden size-4 group-open:block" />
                </span>
              </summary>
              <p className="max-w-2xl pb-5 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
