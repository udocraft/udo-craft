import { getTranslations, setRequestLocale } from "next-intl/server";
import { BizSections } from "@/app/_home/HomeSections";
import { faqJsonLd, loadHomeData, organizationJsonLd } from "@/app/_home/data";
import { jsonLdHtml, pageMetadata, SITE_URL } from "@/lib/seo";

export const revalidate = 60;

const FAQ_KEYS = ["0", "1", "2", "3", "4", "5"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/biz", title: t("bizTitle"), description: t("bizDescription") });
}

/** Company-facing page: corporate merch, services, process, proof and the quote form. */
export default async function BizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [tMeta, tFaq, ctx] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    getTranslations({ locale, namespace: "faq" }),
    loadHomeData(locale),
  ]);

  // Same source as the visible <Faq>: the admin CMS list when published, else translations.
  const cmsItems = ctx.cms.home_faq?.items;
  const faqItems: { question: string; answer: string }[] = Array.isArray(cmsItems)
    ? (cmsItems as { question?: string; answer?: string; q?: string; a?: string }[]).map((i) => ({
        question: i.question ?? i.q ?? "",
        answer: i.answer ?? i.a ?? "",
      }))
    : FAQ_KEYS.map((k) => ({ question: tFaq(`items.${k}.question`), answer: tFaq(`items.${k}.answer`) }));

  const jsonLd = [organizationJsonLd(SITE_URL, tMeta("bizDescription"), ctx.cms), faqJsonLd(faqItems)];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <BizSections ctx={ctx} />
    </>
  );
}
