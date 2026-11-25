import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized-field";
import { coverImages, type HomeCtx } from "./context";

/** Split headline with one accent word, then two large product tiles. */
export async function FeaturedPair({ ctx }: { ctx: HomeCtx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "editorial.pair" });
  const featured = coverImages(ctx, 2);
  if (featured.length === 0) return null;

  return (
    <section aria-labelledby="pair-heading" className="py-section">
      <div className="mx-auto w-full max-w-7xl px-gutter">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <h2 id="pair-heading" className="text-h1 font-semibold text-balance lg:text-display">
            {t("title1")} <span className="text-primary">{t("accent")}</span> {t("title2")}
          </h2>
          <p className="max-w-xl text-lede text-muted-foreground lg:pt-3">{t("desc")}</p>
        </div>

        <ul className="mt-14 grid gap-4 sm:mt-20 md:grid-cols-2 lg:gap-6">
          {featured.map(({ product: p, image }) => {
            const name = localizedField(p.name, p.name_en, ctx.locale);
            const desc = localizedField(p.description ?? "", p.description_en, ctx.locale);
            return (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug || p.id}`}
                  className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[2rem] bg-muted p-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:aspect-[5/6] sm:p-10"
                >
                  <div className="relative z-10 flex items-start justify-between gap-6">
                    <div className="max-w-md">
                      <h3 className="text-h2 font-semibold">{name}</h3>
                      {desc && <p className="mt-3 line-clamp-2 text-base text-muted-foreground">{desc}</p>}
                    </div>
                    <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-background text-foreground transition-transform duration-300 group-hover:rotate-45">
                      <ArrowUpRight className="size-5" />
                    </span>
                  </div>
                  <div className="relative mt-6 flex-1">
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 45vw, 92vw"
                      className="object-contain object-bottom transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                    />
                  </div>
                  {p.base_price_cents > 0 && (
                    <p className="relative z-10 mt-4 text-base tabular-nums">{t("from", { price: (p.base_price_cents / 100).toFixed(0) })}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
