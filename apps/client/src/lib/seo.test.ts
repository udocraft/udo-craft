import { describe, it, expect } from "vitest";
import { jsonLdHtml } from "./seo";

describe("jsonLdHtml", () => {
  it("makes </script> in a product name inert", () => {
    const out = jsonLdHtml({ "@type": "Product", name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out.toLowerCase()).not.toContain("</script");
  });

  it("round-trips through JSON.parse unchanged", () => {
    const data = { name: "</script><b>x</b>", n: 1 };
    expect(JSON.parse(jsonLdHtml(data))).toEqual(data);
  });
});

import { languageAlternates, localizedUrl, ogLocale, pageAlternates, SITE_URL } from "./seo";
import { locales } from "@/i18n/routing";

describe("localizedUrl", () => {
  it("has no prefix for English and a prefix for others", () => {
    expect(localizedUrl("en", "/")).toBe(SITE_URL);
    expect(localizedUrl("en", "/order")).toBe(`${SITE_URL}/order`);
    expect(localizedUrl("uk", "/")).toBe(`${SITE_URL}/uk`);
    expect(localizedUrl("de", "/products/x")).toBe(`${SITE_URL}/de/products/x`);
  });
});

describe("pageAlternates", () => {
  it("lists every locale plus x-default -> English", () => {
    const langs = languageAlternates("/privacy");
    expect(Object.keys(langs).sort()).toEqual([...locales, "x-default"].sort());
    expect(langs["x-default"]).toBe(langs.en);
  });

  it("canonical is the page's own localized URL", () => {
    expect(pageAlternates("pl", "/terms").canonical).toBe(`${SITE_URL}/pl/terms`);
  });
});

describe("ogLocale", () => {
  it("maps every route locale to an og:locale", () => {
    for (const l of locales) expect(ogLocale(l)).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
  });
});

import { pageMetadata } from "./seo";

describe("pageMetadata", () => {
  it("names the locale's share card when no image is given", () => {
    const m = pageMetadata({ locale: "uk", path: "/privacy", title: "T" });
    expect(m.openGraph?.images).toEqual([expect.objectContaining({ url: `${SITE_URL}/uk/opengraph-image` })]);
    expect((m.twitter as { card?: string }).card).toBe("summary_large_image");
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/uk/privacy`);
  });

  it("prefers an explicit image and supports noindex", () => {
    const m = pageMetadata({ locale: "en", path: "/x", title: "T", image: "https://img/x.jpg", noindex: true });
    expect(m.openGraph?.images).toEqual([{ url: "https://img/x.jpg", alt: "T" }]);
    expect(m.robots).toEqual({ index: false, follow: false });
  });
});
