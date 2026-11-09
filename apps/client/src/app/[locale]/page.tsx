import { createServiceClient } from "@/lib/supabase/service";
import { HomeSections } from "@/app/_home/HomeSections";
import { getTranslations } from "next-intl/server";
import { jsonLdHtml, pageAlternates, SITE_URL } from "@/lib/seo";

const FAQ_KEYS = ["0", "1", "2", "3", "4", "5"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const alternates = pageAlternates(locale, "");
  return {
    title: t("title"),
    description: t("description"),
    alternates,
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: alternates.canonical as string,
      siteName: "U:DO CRAFT",
      locale,
      type: "website",
      images: [{ url: "/logo.png", alt: "U:DO CRAFT" }],
    },
  };
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  try {
    const service = createServiceClient();

    const [prodRes, catRes, matRes, varRes, cmsRes] = await Promise.all([
      service.from("products").select("*").eq("is_active", true).order("created_at", { ascending: true }),
      service.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      service.from("materials").select("*").eq("is_active", true),
      service.from("product_color_variants").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      service.from("cms_published").select("slug, body").eq("is_active", true),
    ]);

    const cmsData = (cmsRes.data || []).reduce((acc, item) => {
      acc[item.slug] = (item.body as any) || {};
      return acc;
    }, {} as Record<string, any>);

    const faqItems: { question: string; answer: string }[] =
      cmsData.home_faq?.items ??
      FAQ_KEYS.map((key) => ({
        question: tFaq(`items.${key}.question`),
        answer: tFaq(`items.${key}.answer`),
      }));
    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "U:DO CRAFT",
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: tMeta("description"),
        sameAs: [
          cmsData.home_contact?.instagram ?? "https://www.instagram.com/u.do.craft/",
          cmsData.home_contact?.telegram ?? "https://t.me/udostore",
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "U:DO CRAFT",
        url: SITE_URL,
        inLanguage: locale,
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((i) => ({
          "@type": "Question",
          name: i.question,
          acceptedAnswer: { "@type": "Answer", text: i.answer },
        })),
      },
    ];

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
        <HomeSections
          locale={locale}
          products={prodRes.data || []}
          categories={catRes.data || []}
          materials={matRes.data || []}
          colorVariants={varRes.data || []}
          cms={cmsData}
        />
      </>
    );
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('DYNAMIC_SERVER_USAGE')) {
      throw err;
    }
    console.error("Error fetching home page data:", err);
    return (
      <HomeSections
        locale={locale}
        products={[]}
        categories={[]}
        materials={[]}
        colorVariants={[]}
        cms={{}}
      />
    );
  }
}
