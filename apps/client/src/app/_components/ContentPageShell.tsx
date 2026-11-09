import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { FooterSection } from "@/app/_sections/FooterSection";
import { Container } from "@udo-craft/ui";
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
      <main id="main" className="flex-1 pb-section pt-32">
        <Container width="prose">
          <header className="mb-10 border-b border-border pb-8">
            <h1 className="text-h1 font-semibold text-balance">{title}</h1>
          </header>
          {html ? (
            <article className="cms-prose" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(html) }} />
          ) : (
            <p className="text-muted-foreground">{emptyMessage}</p>
          )}
        </Container>
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
