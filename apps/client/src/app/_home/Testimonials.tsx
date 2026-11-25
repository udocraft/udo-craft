import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Section, SectionHeader } from "@udo-craft/ui";
import { TESTIMONIALS, type Testimonial } from "./testimonials-data";

/**
 * Customer stories: tall full-bleed photos with the quote laid over the bottom.
 * A horizontal snap row, three cards visible on desktop. Hidden while the list is empty.
 */
export async function Testimonials({ locale, items = TESTIMONIALS }: { locale: string; items?: Testimonial[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "home.testimonials" });

  return (
    <Section id="reviews" aria-labelledby="reviews-heading">
      <SectionHeader titleId="reviews-heading" eyebrow={t("eyebrow")} title={t("heading")} />
      <ul
        aria-label={t("listLabel")}
        className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-2 [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <li
            key={item.image}
            className="w-[82%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/3)]"
          >
            <figure className="relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[2rem] bg-muted">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 82vw"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="relative p-7 text-white sm:p-8">
                <blockquote className="text-h4 font-medium text-pretty">“{item.quote}”</blockquote>
                <figcaption className="mt-5">
                  <span className="block text-base font-semibold">{item.name}</span>
                  <span className="block text-sm text-white/70">{item.detail}</span>
                </figcaption>
              </div>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}
