import { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";

const PRIVATE_PATHS = ["/api", "/cabinet", "/checkout"];

export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE_PATHS.flatMap((p) => [p, ...locales.map((l) => `/${l}${p}`)]);
  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: "https://u-do-craft.store/sitemap.xml",
  };
}
