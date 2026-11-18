"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ScrollExpandMedia } from "@/components/ui/scroll-expansion-hero";
import { sound } from "@/lib/sound";

interface HeroSectionProps {
  heading: string;
  subheading: string;
  ctaPrimaryText: string;
  ctaPrimaryUrl: string;
  ctaSecondaryText: string;
}

export function HeroSection({
  heading,
  subheading,
  ctaPrimaryText,
  ctaPrimaryUrl,
  ctaSecondaryText,
}: HeroSectionProps) {
  const t = useTranslations("hero");

  return (
    <>
      {/* Skip link */}
      <a
        href="#catalog"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-6 focus:py-3 focus:rounded-full focus:text-sm focus:font-semibold"
      >
        {t("skipToCatalog")}
      </a>

      <ScrollExpandMedia
        mediaSrc="/hero-video.mp4"
        title={heading}
        ariaLabel={t("mainSection")}
        audioOnScroll
        soundOnLabel={t("soundOn")}
        soundOffLabel={t("soundOff")}
      >
        <div className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center justify-center px-5 py-20 text-center sm:px-10">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-[#7772ff]" />
            U:DO CRAFT <span className="text-white/30">/</span> B2B MERCH
          </p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg"
          >
            {subheading}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
          >
            <a
              href={ctaPrimaryUrl}
              onClick={(e) => {
                sound.button();
                if (ctaPrimaryUrl.startsWith("#")) {
                  e.preventDefault();
                  document.querySelector(ctaPrimaryUrl)?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#5c57ff] px-8 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(92,87,255,0.28)] transition hover:bg-[#716dff] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1020] sm:w-auto"
            >
              {ctaPrimaryText}
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                sound.button();
                e.preventDefault();
                document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-8 text-sm font-medium text-white/80 transition hover:border-white/40 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
            >
              {ctaSecondaryText || t("contactCta")}
            </a>
          </motion.div>
        </div>
      </ScrollExpandMedia>
    </>
  );
}
