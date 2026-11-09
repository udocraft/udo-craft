import { createServiceClient } from "@/lib/supabase/service";
import { HomeSections } from "@/app/_home/HomeSections";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Material, ProductColorVariant } from "@udo-craft/shared";
import type { HomeCategory, HomeProduct } from "@/app/_home/context";
import { jsonLdHtml, pageMetadata, SITE_URL } from "@/lib/seo";

// ISR: the page is prerendered per locale and rebuilt in the background at most
// once a minute, so admin CMS / catalog edits show up within this window.
export const revalidate = 60;

// Only what src/app/_home/* and ProductCardDetailed read. Keep in sync with them.
const PRODUCT_COLUMNS =
  "id, slug, name, name_en, description, description_en, base_price_cents, images, product_images, available_sizes, is_active, category_id";
const CATEGORY_COLUMNS = "id, slug, name, name_en, sort_order, is_active";
const MATERIAL_COLUMNS = "id, name, hex_code, is_active, sort_order";
const VARIANT_COLUMNS = "id, product_id, material_id, images, variant_images, sort_order, is_active";

const FAQ_KEYS = ["0", "1", "2", "3", "4", "5"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "", title: t("title"), description: t("description") });
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });
  try {
    const service = createServiceClient();

    const [prodRes, catRes, matRes, varRes, cmsRes] = await Promise.all([
      service.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).order("created_at", { ascending: true }),
      service.from("categories").select(CATEGORY_COLUMNS).eq("is_active", true).order("sort_order", { ascending: true }),
      service.from("materials").select(MATERIAL_COLUMNS).eq("is_active", true),
      service.from("product_color_variants").select(VARIANT_COLUMNS).eq("is_active", true).order("sort_order", { ascending: true }),
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
          products={(prodRes.data || []) as unknown as HomeProduct[]}
          categories={(catRes.data || []) as HomeCategory[]}
          materials={(matRes.data || []) as unknown as Material[]}
          colorVariants={(varRes.data || []) as unknown as ProductColorVariant[]}
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
