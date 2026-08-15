import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { PageTracker } from "@/components/PageTracker";
import { Toaster } from "@/components/ui/sonner";
import { ClarityInit } from "@/components/clarity";
import { Analytics } from "@vercel/analytics/next";
import { SoundProvider } from "@/app/_components/SoundProvider";
import { MessagesProvider } from "@/components/MessagesProvider";
import { locales } from "@/i18n/routing";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL("https://u-do-craft.store"),
    title: "U:DO CRAFT — Corporate merch",
    description: "B2B merch platform. We create clothing that becomes part of your corporate DNA.",
    alternates: { canonical: "/" },
    openGraph: {
      title: "U:DO CRAFT",
      url: "https://u-do-craft.store",
      siteName: "U:DO CRAFT",
      locale: locale,
      type: "website",
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "U:DO CRAFT",
    url: "https://u-do-craft.store",
    logo: "https://u-do-craft.store/logo.png",
  };

  return (
    <html lang={locale} className={cn()} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <MessagesProvider messages={messages}>
          <ClarityInit clarityId="w7kk9avzfh" />
          <PageTracker />
          <SoundProvider />
          {children}
          <Toaster richColors position="top-right" />
          <Analytics />
        </MessagesProvider>
      </body>
    </html>
  );
}
