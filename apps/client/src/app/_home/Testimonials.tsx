import { getTranslations } from "next-intl/server";
import { coverImages, type HomeCtx } from "./context";
import { DEMO_TESTIMONIALS, TESTIMONIALS, type Testimonial } from "./testimonials-data";
import { TestimonialsCarousel } from "./TestimonialsCarousel";

/**
 * Customer stories: a full-width row of square photos with the quote laid over each,
 * moved with chevrons. While TESTIMONIALS is empty it shows DEMO_TESTIMONIALS
 * (pre-launch sample data — replace before launch).
 */
export async function Testimonials({ ctx, items = TESTIMONIALS }: { ctx: HomeCtx; items?: Testimonial[] }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "home.testimonials" });
  // Pre-launch demo: sample reviews on catalogue photos until real ones are added.
  const covers = coverImages(ctx, DEMO_TESTIMONIALS.length);
  const shown: Testimonial[] = items.length
    ? items
    : DEMO_TESTIMONIALS.map((demo, i) => ({ ...demo, image: covers[i % Math.max(covers.length, 1)]?.image ?? "" })).filter((d) => d.image);
  if (shown.length === 0) return null;

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="py-section">
      <TestimonialsCarousel
        items={shown}
        labels={{ eyebrow: t("eyebrow"), heading: t("heading"), list: t("listLabel"), prev: t("prev"), next: t("next") }}
      />
    </section>
  );
}
