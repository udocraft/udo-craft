import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";

export async function Services({ locale }: { locale: string }) {
  const [t, tBox, tPopup, tSub] = await Promise.all([
    getTranslations({ locale, namespace: "services" }),
    getTranslations({ locale, namespace: "boxOfTouch" }),
    getTranslations({ locale, namespace: "popupStand" }),
    getTranslations({ locale, namespace: "subscription" }),
  ]);

  const cards = [
    {
      key: "box",
      label: tBox("label"),
      title: `${tBox("heading")} ${tBox("headingHighlight")}`,
      body: tBox("desc"),
      cta: tBox("cta"),
      href: "/?ref=box#contact",
    },
    {
      key: "popup",
      label: tPopup("label"),
      title: tPopup("heading"),
      body: t("popup.desc"),
      cta: tPopup("cta"),
      href: "/popup",
    },
    {
      key: "subscription",
      label: tSub("label"),
      title: `${tSub("heading")} ${tSub("headingMuted")}`,
      body: tSub("desc"),
      cta: tSub("cta"),
      href: "/?ref=subscription#contact",
    },
  ];

  return (
    <Section id="services" tone="muted" aria-labelledby="services-heading">
      <SectionHeader
        titleId="services-heading"
        title={`${t("heading")} ${t("headingAccent")}`}
        lede={t("desc")}
      />
      <ul className="grid gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.key} className="flex flex-col rounded-card border border-border bg-card p-6 sm:p-8">
            <p className="text-sm font-medium text-brand">{c.label}</p>
            <h3 className="mt-3 text-h3 font-semibold text-balance">{c.title}</h3>
            <p className="mt-3 flex-1 text-sm text-muted-foreground">{c.body}</p>
            <Link
              href={c.href}
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {c.cta}<span className="sr-only">: {c.title}</span> <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
