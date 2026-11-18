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
  visualImage: string | null;
  visualAlt: string;
}

export function HeroSection({
  heading,
  subheading,
  ctaPrimaryText,
  ctaPrimaryUrl,
  ctaSecondaryText,
  visualImage,
  visualAlt,
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
      >
        <div className="mx-auto grid min-h-[100svh] w-full max-w-[1440px] items-center gap-10 px-5 py-20 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:px-20 lg:py-28">
          <div className="relative z-10 mx-auto w-full max-w-3xl text-center lg:mx-0 lg:text-left">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-[#7772ff]" />
              U:DO CRAFT <span className="text-white/30">/</span> B2B MERCH
            </p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg lg:mx-0"
            >
              {subheading}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center lg:justify-start"
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

          <div className="relative z-10 mx-auto w-full max-w-[560px] lg:mx-0">
            <div className="absolute -inset-8 rounded-full bg-[#514cff]/20 blur-3xl" aria-hidden="true" />
            <div className="relative aspect-[1.04/1] overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.06] p-3 shadow-[0_32px_100px_rgba(0,0,0,0.38)] backdrop-blur-sm sm:rounded-[2.5rem] sm:p-4">
              <div className="absolute inset-3 rounded-[1.5rem] bg-[radial-gradient(ellipse_at_55%_38%,rgba(115,111,255,0.34),transparent_58%),linear-gradient(145deg,rgba(255,255,255,0.12),rgba(255,255,255,0.015))] sm:inset-4 sm:rounded-[2rem]" />
              {visualImage && (
                <motion.img
                  src={visualImage}
                  alt={visualAlt}
                  initial={{ opacity: 0, scale: 1.04, y: 10 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] rounded-[1.5rem] object-contain p-5 sm:inset-4 sm:h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:rounded-[2rem] sm:p-8"
                />
              )}
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/15 bg-[#111429]/70 px-4 py-3 backdrop-blur-xl sm:bottom-7 sm:left-7 sm:right-7 sm:px-5 sm:py-4">
                <span className="text-xs font-medium text-white/70 sm:text-sm">{visualAlt || "U:DO CRAFT"}</span>
                <span className="size-2 rounded-full bg-[#7772ff] shadow-[0_0_16px_rgba(119,114,255,0.9)]" />
              </div>
            </div>
          </div>
        </div>
      </ScrollExpandMedia>
    </>
  );
}
