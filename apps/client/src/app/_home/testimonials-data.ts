export interface Testimonial {
  /** Full-height photo of the customer, ideally wearing their piece. Put files in public/testimonials/. */
  image: string;
  /** The customer's own words, in the language they wrote them. */
  quote: string;
  name: string;
  /** Short context, e.g. "Київ · худі з вишивкою". */
  detail: string;
}

/**
 * Real customers' photos and words only, published with their permission.
 * Empty = the home page hides the testimonials section. Entry shape:
 *   { image: "/testimonials/olena.jpg", quote: "…", name: "Олена", detail: "Львів · футболка" }
 */
export const TESTIMONIALS: Testimonial[] = [];
