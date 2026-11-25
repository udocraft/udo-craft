import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeSections } from "@/app/_home/HomeSections";
import { faqJsonLd, loadHomeData, organizationJsonLd } from "@/app/_home/data";
import { getB2cFaqItems } from "@/app/_home/b2c-faq";
import { jsonLdHtml, pageMetadata, SITE_URL } from "@/lib/seo";

// ISR: the page is prerendered per locale and rebuilt in the background at most
// once a minute, so admin CMS / catalog edits show up within this window.
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "", title: t("title"), description: t("description") });
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [tMeta, ctx, faqItems] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    loadHomeData(locale),
    getB2cFaqItems(locale),
  ]);

  const jsonLd = [
    organizationJsonLd(SITE_URL, tMeta("description"), ctx.cms),
    { "@context": "https://schema.org", "@type": "WebSite", name: "U:DO CRAFT", url: SITE_URL, inLanguage: locale },
    faqJsonLd(faqItems),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <HomeSections ctx={ctx} faqItems={faqItems} />
    </>
  );
}
