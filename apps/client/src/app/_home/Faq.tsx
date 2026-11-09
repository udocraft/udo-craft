import { getTranslations } from "next-intl/server";
import { Minus, Plus } from "lucide-react";
import { Section } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";
import type { HomeCtx } from "./context";

const FAQ_KEYS = ["0", "1", "2", "3", "4", "5"] as const;

interface FaqItem { question?: string; answer?: string; q?: string; a?: string }

export async function Faq({ ctx }: { ctx: HomeCtx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "faq" });
  const data = ctx.cms.home_faq ?? {};
  const heading = (typeof data.heading === "string" && data.heading) || t("heading");
  const items: { q: string; a: string }[] = Array.isArray(data.items)
    ? (data.items as FaqItem[]).map((i) => ({ q: i.question ?? i.q ?? "", a: i.answer ?? i.a ?? "" }))
    : FAQ_KEYS.map((k) => ({ q: t(`items.${k}.question`), a: t(`items.${k}.answer`) }));

  return (
    <Section id="faq" tone="muted" aria-labelledby="faq-heading">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <div className="self-start lg:sticky lg:top-28">
          <h2 id="faq-heading" className="text-h2 font-semibold text-balance">
            {heading}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t("noAnswer")}{" "}
            <Link href="#contact" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              {t("contactUs")}
            </Link>
            {t("replyTime")}
          </p>
        </div>

        <div className="border-t border-border">
          {items.map((item, i) => (
            <details key={i} className="group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-semibold marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                  aria-hidden="true"
                >
                  <Plus className="size-4 group-open:hidden" />
                  <Minus className="hidden size-4 group-open:block" />
                </span>
              </summary>
              <p className="max-w-2xl pb-5 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
