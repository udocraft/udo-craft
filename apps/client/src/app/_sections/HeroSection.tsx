"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Play, X } from "lucide-react";
import { RoughHighlight } from "@/app/_components/HighlightText";
import { sound } from "@/lib/sound";

interface HeroSectionProps {
  cinemaMode: boolean;
  onCinemaEnter: () => void;
  onCinemaExit: () => void;
  heading: string;
  subheading: string;
  ctaPrimaryText: string;
  ctaPrimaryUrl: string;
  ctaSecondaryText: string;
}

function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.2em] last:mr-0">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.2 + i * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function HeroSection({
  cinemaMode,
  onCinemaEnter,
  onCinemaExit,
  heading,
  subheading,
  ctaPrimaryText,
  ctaPrimaryUrl,
  ctaSecondaryText,
}: HeroSectionProps) {
  const t = useTranslations("hero");
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const playVideo = () => {
      if (bgVideoRef.current) {
        bgVideoRef.current.play().catch(() => {});
      }
    };

    playVideo();
    window.addEventListener("touchstart", playVideo, { once: true });
    window.addEventListener("mousedown", playVideo, { once: true });
    window.addEventListener("scroll", playVideo, { once: true });

    return () => {
      window.removeEventListener("touchstart", playVideo);
      window.removeEventListener("mousedown", playVideo);
      window.removeEventListener("scroll", playVideo);
    };
  }, []);

  return (
    <section
      className="relative min-h-[100svh] bg-[#060812] overflow-hidden flex flex-col"
      aria-label={t("mainSection")}
    >
      {/* Skip link */}
      <a
        href="#catalog"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-6 focus:py-3 focus:rounded-full focus:text-sm focus:font-semibold"
      >
        {t("skipToCatalog")}
      </a>

      {/* Video */}
      <video
        ref={bgVideoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-[opacity] duration-[2s] pointer-events-none"
        onPlaying={(e) => {
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            (e.target as HTMLVideoElement).style.opacity = "0.3";
          }
        }}
        src="/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload="metadata"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060812]/80 pointer-events-none"
        aria-hidden="true"
      />

      {/* Cinema overlay */}
      <AnimatePresence>
        {cinemaMode && (
          <motion.div
            key="cinema"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black"
            role="dialog"
            aria-modal="true"
            aria-label={t("fullscreenVideo")}
          >
            <video
              ref={(el) => {
                if (el) {
                  el.muted = false;
                  el.volume = 0.8;
                  el.play().catch(() => {
                    el.muted = true;
                    el.play().catch(() => {});
                  });
                }
              }}
              className="absolute inset-0 w-full h-full object-cover"
              src="/hero-video.mp4"
              loop
              playsInline
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <motion.div
        animate={{ opacity: cinemaMode ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: cinemaMode ? "none" : "auto" } as React.CSSProperties}
        className="relative flex-1 flex flex-col items-center justify-center px-5 sm:px-10 pt-24 pb-20 text-center"
        aria-hidden={cinemaMode}
      >
        <h1
          className="text-white font-black leading-[0.92] tracking-[-0.025em] mb-6 max-w-4xl"
          style={{ fontSize: "clamp(2.2rem, 6.5vw, 6rem)" }}
        >
          <AnimatedHeadline text={heading} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-white/70 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed"
        >
          {subheading}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto"
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
            className="inline-flex items-center justify-center gap-2 bg-white text-[#06060e] font-bold text-sm px-8 py-4 rounded-full hover:bg-white/90 active:scale-[0.97] transition-all duration-200 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
            className="inline-flex items-center justify-center gap-2 border border-white/20 text-white/70 font-semibold text-sm px-8 py-4 rounded-full hover:border-white/40 hover:text-white active:scale-[0.97] transition-all duration-200 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            {ctaSecondaryText || t("contactCta")}
          </a>
        </motion.div>
      </motion.div>

      {/* Video reel button */}
      <motion.button
        onClick={cinemaMode ? onCinemaExit : onCinemaEnter}
        aria-label={cinemaMode ? t("closeVideo") : t("watchVideo")}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`z-[9999] w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          cinemaMode
            ? "fixed bottom-8 right-6 sm:right-8"
            : "absolute bottom-8 right-6 sm:right-8"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {cinemaMode ? (
            <motion.span key="close"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span key="play"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Scroll chevron — bottom center */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 2.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        aria-hidden="true"
      >
        <a href="#catalog" tabIndex={-1} aria-hidden="true">
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-white/30" />
          </motion.div>
        </a>
      </motion.div>
    </section>
  );
}
