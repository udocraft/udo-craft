import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { FooterSection } from "@/app/_sections/FooterSection";
import { sanitizeCmsHtml } from "@/lib/sanitize-cms-html";

export async function ContentPageShell({
  title,
  html,
  emptyMessage,
}: {
  title: string;
  html: string | null;
  emptyMessage: string;
}) {
  const tFooter = await getTranslations("footer");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="main" className="flex-1 px-4 pb-20 pt-32 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <header className="mb-8 border-b border-border/70 pb-7 sm:mb-10 sm:pb-9">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">U:DO CRAFT</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          </header>
          {html ? (
            <article
              className="cms-prose rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-9"
              dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(html) }}
            />
          ) : (
            <p className="rounded-3xl border border-border/70 bg-card p-6 text-sm leading-relaxed text-muted-foreground sm:p-9">
              {emptyMessage}
            </p>
          )}
        </div>
      </main>
      <FooterSection
        tagline={tFooter("tagline")}
        copyright={tFooter("copyright")}
        instagram="https://www.instagram.com/u.do.craft/"
        telegram="https://t.me/udostore"
      />
    </div>
  );
}
