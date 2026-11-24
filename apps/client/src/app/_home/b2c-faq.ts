import { getTranslations } from "next-intl/server";

/**
 * Shopper FAQ for the B2C home. Two answers are new (`home.faq.*`); two reuse the
 * existing, already-translated answers on production time (`faq.items.2`) and on what
 * happens if the result is not right (`faq.items.4`). Rendered on the page and in
 * the FAQPage JSON-LD, so both always match.
 */
export async function getB2cFaqItems(locale: string): Promise<{ question: string; answer: string }[]> {
  const [t, tFaq] = await Promise.all([
    getTranslations({ locale, namespace: "home.faq" }),
    getTranslations({ locale, namespace: "faq" }),
  ]);
  return [
    { question: t("single.question"), answer: t("single.answer") },
    { question: t("design.question"), answer: t("design.answer") },
    { question: tFaq("items.2.question"), answer: tFaq("items.2.answer") },
    { question: tFaq("items.4.question"), answer: tFaq("items.4.answer") },
  ];
}
