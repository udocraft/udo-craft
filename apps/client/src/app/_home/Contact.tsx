import { getTranslations } from "next-intl/server";
import { ArrowRight, Instagram, Send } from "lucide-react";
import { Button, Section } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";
import { ContactForm } from "@/components/ContactForm";
import { cmsAttrs, cmsText, cmsValue, type HomeCtx } from "./context";

export async function Contact({ ctx }: { ctx: HomeCtx }) {
  const [t, tContact, tCta] = await Promise.all([
    getTranslations({ locale: ctx.locale, namespace: "homeContact" }),
    getTranslations({ locale: ctx.locale, namespace: "contact" }),
    getTranslations({ locale: ctx.locale, namespace: "finalCta" }),
  ]);

  const email = cmsValue(ctx, "home_contact", "email", "info@udocraft.com");
  const phone = cmsValue(ctx, "home_contact", "phone", "+380 63 070 33 072");
  const address = cmsText(ctx, "home_contact", "address", t("address"));
  const instagram = cmsValue(ctx, "home_contact", "instagram", "https://www.instagram.com/u.do.craft/");
  const telegram = cmsValue(ctx, "home_contact", "telegram", "https://t.me/udostore");

  const linkCls =
    "inline-flex min-h-11 items-center rounded-control text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Section id="contact" tone="inverse" aria-labelledby="contact-heading">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div>
          <h2 id="contact-heading" className="text-h1 font-semibold text-balance" {...cmsAttrs(ctx, "home_contact", "heading")}>
            {cmsText(ctx, "home_contact", "heading", t("heading"))}
          </h2>
          <p className="mt-4 max-w-md text-lede text-muted-foreground" {...cmsAttrs(ctx, "home_contact", "subtext")}>
            {cmsText(ctx, "home_contact", "subtext", t("subtext"))}
          </p>

          <div className="mt-8">
            <Button asChild variant="primary" size="lg">
              <Link href="/order">
                {tCta("cta")} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">{tCta("footer")}</p>
          </div>

          <dl className="mt-10 space-y-5">
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd>
                <a className={linkCls} href={`mailto:${email}`}>
                  {email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{tContact("phone")}</dt>
              <dd>
                <a className={linkCls} href={`tel:${phone.replace(/\s/g, "")}`}>
                  {phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{tContact("address")}</dt>
              <dd className="py-2">{address}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href={instagram} target="_blank" rel="noopener noreferrer">
                <Instagram aria-hidden="true" /> Instagram
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={telegram} target="_blank" rel="noopener noreferrer">
                <Send aria-hidden="true" /> Telegram
              </a>
            </Button>
          </div>
        </div>

        <ContactForm />
      </div>
    </Section>
  );
}
