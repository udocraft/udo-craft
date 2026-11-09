import { getTranslations } from "next-intl/server";
import { Container } from "@udo-craft/ui";

// Names shown as plain text. Confirm with the business that each one may be listed.
const BRANDS = [
  "Kyivstar", "Genesis", "Monobank", "Rozetka", "Nova Poshta",
  "Uklon", "Grammarly", "Ajax Systems", "MacPaw", "Intellias",
  "Reface", "Preply", "Jooble", "Depositphotos", "Ciklum",
];

export async function ProofBar({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "socialProof" });
  return (
    <section className="border-b border-border py-10" aria-label={t("ariaLabel")}>
      <Container>
        <p className="text-center text-sm text-muted-foreground">{t("trustedBy")}</p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {BRANDS.map((brand) => (
            <li key={brand} className="text-base font-semibold text-muted-foreground">
              {brand}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
