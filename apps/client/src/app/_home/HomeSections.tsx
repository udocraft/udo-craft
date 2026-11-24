import { Fragment, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { FooterSection } from "@/app/_sections/FooterSection";
import { resolveHomeLayout, type HomeSectionId } from "@/lib/home-layout";
import { CmsPreviewBridge } from "./CmsPreviewBridge";
import { cmsText, cmsValue, type HomeCtx } from "./context";
import { Hero } from "./Hero";
import { BizHero } from "./BizHero";
import { ProofBar } from "./ProofBar";
import { Collections } from "./Collections";
import { LiveDemo } from "./LiveDemo";
import { HowItWorks } from "./HowItWorks";
import { Steps } from "./Steps";
import { Services } from "./Services";
import { WhyUs } from "./WhyUs";
import { Faq } from "./Faq";
import { HomeFaq } from "./HomeFaq";
import { Contact } from "./Contact";
import { BizBand } from "./BizBand";

/** Sections on the shopper home. The CMS `home_layout` still orders and hides them. */
const B2C_SECTIONS: readonly HomeSectionId[] = ["hero", "collections", "demo", "process", "faq"];
/** Sections on /biz, in CMS order. Catalog and the live demo stay on the home page. */
const BIZ_SECTIONS: readonly HomeSectionId[] = ["hero", "proof", "process", "services", "why", "faq", "contact"];

type FaqItems = { question: string; answer: string }[];

function renderB2c(id: HomeSectionId, ctx: HomeCtx, faqItems: FaqItems): ReactNode {
  switch (id) {
    case "hero": return <Hero ctx={ctx} />;
    case "collections": return <Collections ctx={ctx} />;
    case "demo": return <LiveDemo ctx={ctx} />;
    case "process": return <Steps locale={ctx.locale} />;
    case "faq":
      return <HomeFaq locale={ctx.locale} items={faqItems} telegram={cmsValue(ctx, "home_contact", "telegram", "https://t.me/udostore")} />;
    default: return null;
  }
}

function renderBiz(id: HomeSectionId, ctx: HomeCtx): ReactNode {
  switch (id) {
    case "hero": return <BizHero ctx={ctx} />;
    case "proof": return <ProofBar locale={ctx.locale} />;
    case "process": return <HowItWorks locale={ctx.locale} />;
    case "services": return <Services locale={ctx.locale} />;
    case "why": return <WhyUs ctx={ctx} />;
    case "faq": return <Faq ctx={ctx} />;
    case "contact": return <Contact ctx={ctx} />;
    default: return null;
  }
}

async function Shell({ ctx, children }: { ctx: HomeCtx; children: ReactNode }) {
  const tFooter = await getTranslations({ locale: ctx.locale, namespace: "footer" });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <CmsPreviewBridge />
      <main id="main">{children}</main>
      <FooterSection
        showCta={false}
        tagline={cmsText(ctx, "footer", "tagline", tFooter("tagline"))}
        copyright={cmsText(ctx, "footer", "copyright", tFooter("copyright"))}
        instagram={cmsValue(ctx, "home_contact", "instagram", "https://www.instagram.com/u.do.craft/")}
        telegram={cmsValue(ctx, "home_contact", "telegram", "https://t.me/udostore")}
      />
    </div>
  );
}

/**
 * Shopper home. Server component: sections render to HTML and only the interactive
 * islands (hero media, catalog filter, live demo, header) ship JavaScript.
 */
export async function HomeSections({ ctx, faqItems }: { ctx: HomeCtx; faqItems: FaqItems }) {
  const layout = resolveHomeLayout(ctx.cms.home_layout?.sections).filter((id) => B2C_SECTIONS.includes(id));
  return (
    <Shell ctx={ctx}>
      {layout.map((id) => (
        <Fragment key={id}>{renderB2c(id, ctx, faqItems)}</Fragment>
      ))}
      <BizBand locale={ctx.locale} />
    </Shell>
  );
}

/** /biz: the company-facing sections (offers, process, proof, quote form). */
export async function BizSections({ ctx }: { ctx: HomeCtx }) {
  const layout = resolveHomeLayout(ctx.cms.home_layout?.sections).filter((id) => BIZ_SECTIONS.includes(id));
  return (
    <Shell ctx={ctx}>
      {layout.map((id) => (
        <Fragment key={id}>{renderBiz(id, ctx)}</Fragment>
      ))}
    </Shell>
  );
}
