import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Gift } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { coverImages, type HomeCtx } from "./context";

/** Split headline with one accent word, then two category tiles: custom clothing (live) and souvenirs (coming soon). */
export async function FeaturedPair({ ctx }: { ctx: HomeCtx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "editorial.pair" });
  // The clothing tile borrows the first active product's cover photo.
  const image = coverImages(ctx, 1)[0]?.image;

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
          <li>
            <Link
              href="/#catalog"
              className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[2rem] bg-muted p-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:aspect-[5/6] sm:p-10"
            >
              <div className="relative z-10 flex items-start justify-between gap-6">
                <div className="max-w-md">
                  <h3 className="text-h2 font-semibold">{t("clothing.title")}</h3>
                  <p className="mt-3 line-clamp-2 text-base text-muted-foreground">{t("clothing.desc")}</p>
                </div>
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-background text-foreground transition-transform duration-300 group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
              </div>
              <div className="relative mt-6 flex-1">
                {image && (
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 45vw, 92vw"
                    className="object-contain object-bottom transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                )}
              </div>
            </Link>
          </li>
          <li>
            {/* Not live yet: a plain block, no link, no arrow, no hover. */}
            <div
              aria-disabled="true"
              className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-[2rem] bg-muted p-7 sm:aspect-[5/6] sm:p-10"
            >
              <div className="relative z-10 flex items-start justify-between gap-6">
                <div className="max-w-md">
                  <h3 className="text-h2 font-semibold">{t("souvenirs.title")}</h3>
                  <p className="mt-3 line-clamp-2 text-base text-muted-foreground">{t("souvenirs.desc")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground">
                  {t("souvenirs.soon")}
                </span>
              </div>
              <div className="relative mt-6 grid flex-1 place-items-center">
                <Gift aria-hidden="true" strokeWidth={1} className="size-2/5 text-muted-foreground/30" />
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
