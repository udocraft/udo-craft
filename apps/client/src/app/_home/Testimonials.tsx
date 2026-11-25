import { getTranslations } from "next-intl/server";
import { TESTIMONIALS, type Testimonial } from "./testimonials-data";
import { TestimonialsCarousel } from "./TestimonialsCarousel";

/**
 * Customer stories: a full-width row of square photos with the quote laid over each,
 * moved with chevrons. Hidden while the list is empty.
 */
export async function Testimonials({ locale, items = TESTIMONIALS }: { locale: string; items?: Testimonial[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "home.testimonials" });

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="py-section">
      <TestimonialsCarousel
        items={items}
        labels={{ eyebrow: t("eyebrow"), heading: t("heading"), list: t("listLabel"), prev: t("prev"), next: t("next") }}
      />
    </section>
  );
}
