// English catalog copy is used on the en locale when it is filled in.
// Empty values fall back to the base (Ukrainian) field.
export function localizedField(base: string, en: string | null | undefined, locale: string): string {
  return locale === "en" && en ? en : base;
}
