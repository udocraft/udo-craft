import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button, Section, SectionHeader } from "@udo-craft/ui";
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
          <Button asChild variant="ghost">
            <Link href="/order">
              {t("allProducts")} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
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
