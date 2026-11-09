import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";

// The popup page is a client component, so its metadata lives in this layout.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/popup", title: t("popupTitle"), description: t("popupDescription") });
}

export default function PopupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
