import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { GEIST_REGULAR_BASE64 } from "./fonts/geist-regular";
import { GEIST_SEMIBOLD_BASE64 } from "./fonts/geist-semibold";
import { OG_ACCENT, OG_BACKGROUND, OG_FOREGROUND, OG_MUTED } from "@/lib/canvas-colors";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/** 1200x630 share card for one locale: wordmark, localized headline and description. */
export async function renderOgImage(locale: string) {
  const t = await getTranslations({ locale, namespace: "meta" });
  // Static Geist cuts (Latin + Cyrillic subset) instanced from the site's variable font:
  // satori cannot parse the variable file. Cyrillic keeps the uk card free of tofu.
  // Static Geist cuts (Latin + Cyrillic): satori cannot parse the variable font, and
  // Cyrillic keeps the uk card free of tofu.
  const regular = Buffer.from(GEIST_REGULAR_BASE64, "base64");
  const semibold = Buffer.from(GEIST_SEMIBOLD_BASE64, "base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: OG_BACKGROUND,
          color: OG_FOREGROUND,
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: OG_ACCENT }} />
          U:DO CRAFT
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>{t("title")}</div>
          <div style={{ fontSize: 32, lineHeight: 1.3, color: OG_MUTED, maxWidth: 940 }}>{t("description")}</div>
        </div>
        <div style={{ fontSize: 28, color: OG_ACCENT }}>u-do-craft.store</div>
      </div>
    ),
    { ...OG_SIZE, fonts: [
        { name: "Geist", data: regular, style: "normal", weight: 400 },
        { name: "Geist", data: semibold, style: "normal", weight: 600 },
      ] },
  );
}
