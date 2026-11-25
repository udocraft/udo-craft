import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { Link } from "@/i18n/navigation";
import { StatementFill } from "./StatementFill";
import { coverImages, type HomeCtx } from "./context";

/** Editorial statement under the hero: one large sentence with product pills inline. */
export async function Statement({ ctx }: { ctx: HomeCtx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "editorial.statement" });
  const images = coverImages(ctx, 3).map((c) => c.image);

  return (
    <section aria-labelledby="statement-heading" className="py-section">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-gutter text-center">
        <p className="mb-8 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">{t("eyebrow")}</p>
        <StatementFill headingId="statement-heading" chunks={[t("part1"), t("part2"), t("part3")]} images={images} />
        <Link href="/order" prefetch={false} className={buttonVariants({ variant: "primary", size: "lg", className: "mt-14" })}>
          {t("cta")} <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
