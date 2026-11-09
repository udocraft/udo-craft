import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { FooterSection } from "@/app/_sections/FooterSection";
import { resolveHomeLayout, type HomeSectionId } from "@/lib/home-layout";
import { CmsPreviewBridge } from "./CmsPreviewBridge";
import { cmsText, cmsValue, type HomeCtx } from "./context";
import { Hero } from "./Hero";
import { ProofBar } from "./ProofBar";
import { Collections } from "./Collections";
import { LiveDemo } from "./LiveDemo";
import { HowItWorks } from "./HowItWorks";
import { Services } from "./Services";
import { WhyUs } from "./WhyUs";
import { Faq } from "./Faq";
import { Contact } from "./Contact";

function renderSection(id: HomeSectionId, ctx: HomeCtx) {
  switch (id) {
    case "hero": return <Hero ctx={ctx} />;
    case "proof": return <ProofBar locale={ctx.locale} />;
    case "collections": return <Collections ctx={ctx} />;
    case "demo": return <LiveDemo ctx={ctx} />;
    case "process": return <HowItWorks locale={ctx.locale} />;
    case "services": return <Services locale={ctx.locale} />;
    case "why": return <WhyUs ctx={ctx} />;
    case "faq": return <Faq ctx={ctx} />;
    case "contact": return <Contact ctx={ctx} />;
  }
}

/**
 * Home page shell. Server component: marketing sections render to HTML and
 * only the interactive islands (hero media, catalog filter, live demo,
 * contact form, header) ship JavaScript. `home_layout` from the CMS may use
 * the old 16 section ids; resolveHomeLayout maps them onto these 9.
 */
export async function HomeSections(ctx: HomeCtx) {
  const tFooter = await getTranslations({ locale: ctx.locale, namespace: "footer" });
  const layout = resolveHomeLayout(ctx.cms.home_layout?.sections);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <CmsPreviewBridge />
      <main id="main">
        {layout.map((id) => (
          <Fragment key={id}>{renderSection(id, ctx)}</Fragment>
        ))}
      </main>
      <FooterSection
        tagline={cmsText(ctx, "footer", "tagline", tFooter("tagline"))}
        copyright={cmsText(ctx, "footer", "copyright", tFooter("copyright"))}
        instagram={cmsValue(ctx, "home_contact", "instagram", "https://www.instagram.com/u.do.craft/")}
        telegram={cmsValue(ctx, "home_contact", "telegram", "https://t.me/udostore")}
      />
    </div>
  );
}
