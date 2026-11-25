"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized-field";
import type { Product } from "@udo-craft/shared";
import { FadeUp } from "@/app/_components/FadeUp";

interface FeaturedPairSectionProps {
  /** Products with a resolved cover image (first two are shown). */
  items: { product: Product; image: string }[];
}

/**
 * Split headline with one accent word, then two large product tiles (reference 2).
 * Picks the first two active products that have an image.
 */
export function FeaturedPairSection({ items }: FeaturedPairSectionProps) {
  const t = useTranslations("editorial.pair");
  const locale = useLocale();

  const featured = items.slice(0, 2).map(({ product, image }) => ({ p: product, img: image }));

  if (featured.length === 0) return null;

  return (
    <section aria-labelledby="pair-heading" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <h2
            id="pair-heading"
            className="text-[clamp(2.25rem,5vw,4.5rem)] font-medium leading-[1.02] tracking-[-0.035em] text-balance"
          >
            {t("title1")}{" "}
            <span className="text-primary">{t("accent")}</span>{" "}
            {t("title2")}
          </h2>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground lg:pt-3">{t("desc")}</p>
        </div>

        <div className="mt-14 grid gap-4 sm:mt-20 md:grid-cols-2 lg:gap-6">
          {featured.map(({ p, img }, i) => {
            const name = localizedField(p.name, p.name_en, locale);
            const desc = localizedField(p.description ?? "", p.description_en, locale);
            return (
              <FadeUp key={p.id} delay={i * 0.08}>
                <Link
                  href={`/products/${p.slug || p.id}`}
                  className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[2rem] bg-muted p-7 sm:aspect-[5/6] sm:p-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                >
                  <div className="relative z-10 flex items-start justify-between gap-6">
                    <div className="max-w-md">
                      <h3 className="text-2xl font-medium tracking-[-0.02em] sm:text-4xl">{name}</h3>
                      {desc && <p className="mt-3 line-clamp-2 text-base text-muted-foreground">{desc}</p>}
                    </div>
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-background text-foreground transition-transform duration-300 group-hover:rotate-45" aria-hidden="true">
                      <ArrowUpRight className="size-5" />
                    </span>
                  </div>
                  <div className="relative mt-6 flex-1">
                    <Image
                      src={img}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 45vw, 92vw"
                      className="object-contain object-bottom transition-transform duration-700 ease-[var(--ease-out-strong)] group-hover:scale-[1.04]"
                    />
                  </div>
                  {p.base_price_cents > 0 && (
                    <p className="relative z-10 mt-4 text-base tabular-nums text-foreground">
                      {t("from", { price: (p.base_price_cents / 100).toFixed(0) })}
                    </p>
                  )}
                </Link>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
