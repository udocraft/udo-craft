import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/service";
import { pageAlternates } from "@/lib/seo";
import { ContentPageShell } from "@/app/_components/ContentPageShell";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: `${t("title")} — U:DO CRAFT`, alternates: pageAlternates(locale, "/privacy") };
}

// CMS legal text rarely changes; rebuild at most every 5 minutes.
export const revalidate = 300;

async function getContent() {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("cms_content")
      .select("body")
      .eq("slug", "page_privacy")
      .single();
    return data?.body as { title?: string; html?: string } | null;
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('DYNAMIC_SERVER_USAGE')) {
      throw err;
    }
    return null;
  }
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacy" });
  const content = await getContent();
  const html = content?.html ?? "";

  return (
    <ContentPageShell
      title={content?.title || t("title")}
      html={html || null}
      emptyMessage={t("noContent")}
    />
  );
}
