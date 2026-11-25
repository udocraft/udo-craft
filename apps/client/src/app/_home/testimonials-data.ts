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
 * Empty = the section shows DEMO_TESTIMONIALS (pre-launch). Entry shape:
 *   { image: "/testimonials/olena.jpg", quote: "…", name: "Олена", detail: "Львів · футболка" }
 */
export const TESTIMONIALS: Testimonial[] = [];

/**
 * DEMO ONLY (pre-launch). Invented sample reviews so the section can be shown in
 * demos; used only while TESTIMONIALS is empty. Replace with real reviews (or empty
 * this list) before launch. Photos come from the product catalogue at render time.
 */
export const DEMO_TESTIMONIALS: Omit<Testimonial, "image">[] = [
  { quote: "Замовили худі з логотипом для всієї команди — тканина щільна, вишивка рівна, після прання як нове.", name: "Олена", detail: "Київ · худі з вишивкою" },
  { quote: "Зробила футболку з власним малюнком на подарунок. Друк яскравий, доставили за кілька днів.", name: "Марта", detail: "Львів · футболка з принтом" },
  { quote: "Конструктор простий: завантажив файл, підібрав розмір — і все. Результат точно як на екрані.", name: "Андрій", detail: "Одеса · базова футболка" },
  { quote: "Брали мерч на конференцію, 60 штук. Все вчасно, менеджер допоміг з макетом.", name: "Ірина", detail: "Дніпро · корпоративний мерч" },
  { quote: "Друга покупка тут. Оверсайз сидить ідеально, принт не тріскається.", name: "Максим", detail: "Харків · оверсайз футболка" },
  { quote: "Шукали локальне виробництво з нормальною якістю — знайшли. Будемо замовляти ще.", name: "Софія", detail: "Вінниця · світшот" },
];
