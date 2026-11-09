import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@udo-craft/ui";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { Link } from "@/i18n/navigation";
import { CollectionsGrid } from "./CollectionsGrid";
import type { HomeCtx } from "./context";

export async function Collections({ ctx }: { ctx: HomeCtx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "collections" });
  return (
    <Section id="catalog" aria-labelledby="catalog-heading">
      <SectionHeader
        titleId="catalog-heading"
        title={t("heading")}
        action={
          <Link href="/order" className={buttonVariants({ variant: "ghost" })}>
            {t("allProducts")} <ArrowRight aria-hidden="true" />
          </Link>
        }
      />
      <CollectionsGrid
        products={ctx.products}
        categories={ctx.categories}
        materials={ctx.materials}
        colorVariants={ctx.colorVariants}
      />
    </Section>
  );
}
