"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Play, X } from "lucide-react";
import { Button } from "@udo-craft/ui";
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
  visualImage: string | null;
  visualAlt: string;
}

function AnimatedHeadline({ text }: { text: string }) {
  return <span>{text}</span>;
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
  visualImage,
  visualAlt,
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
      className="inverse relative min-h-[100svh] overflow-hidden bg-background text-foreground"
      aria-label={t("mainSection")}
    >
      {/* Video */}
      <video
        ref={bgVideoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity] duration-[2s] pointer-events-none"
        onPlaying={(e) => {
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            (e.target as HTMLVideoElement).style.opacity = "0.14";
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
        className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/65 to-background pointer-events-none"
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

      <motion.div
        animate={{ opacity: cinemaMode ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        style={{ pointerEvents: cinemaMode ? "none" : "auto" } as React.CSSProperties}
        className="relative mx-auto grid min-h-[100svh] w-full max-w-[1440px] flex-1 items-center gap-10 px-5 pb-24 pt-32 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:px-20 lg:py-32"
        aria-hidden={cinemaMode}
      >
        <div className="relative z-10 mx-auto w-full max-w-3xl text-center lg:mx-0 lg:text-left">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-brand" />
            U:DO CRAFT <span className="text-white/30">/</span> B2B MERCH
          </p>
          <h1
            className="mb-6 text-white font-semibold leading-[0.94] tracking-[-0.055em]"
            style={{ fontSize: "clamp(2.75rem, 6.2vw, 6.5rem)" }}
          >
            <AnimatedHeadline text={heading} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg lg:mx-0"
          >
            {subheading}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center lg:justify-start"
          >
            <Button
              asChild
              variant="primary"
              size="lg"
              className="w-full shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:w-auto"
            >
              <a href={ctaPrimaryUrl} onClick={() => sound.button()}>
                {ctaPrimaryText}
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full bg-transparent sm:w-auto">
              <a href="#contact" onClick={() => sound.button()}>
                  {ctaSecondaryText || t("contactCta")}
              </a>
            </Button>
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:mx-0">
          <div className="absolute -inset-8 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
          <div className="relative aspect-[1.04/1] overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.06] p-3 shadow-[0_32px_100px_rgba(0,0,0,0.38)] backdrop-blur-sm sm:rounded-[2.5rem] sm:p-4">
            <div className="absolute inset-3 rounded-[1.5rem] bg-[radial-gradient(ellipse_at_55%_38%,rgba(115,111,255,0.34),transparent_58%),linear-gradient(145deg,rgba(255,255,255,0.12),rgba(255,255,255,0.015))] sm:inset-4 sm:rounded-[2rem]" />
            {visualImage && (
              <motion.img
                src={visualImage}
                alt={visualAlt}
                initial={{ opacity: 0, scale: 1.04, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] rounded-[1.5rem] object-contain p-5 sm:inset-4 sm:h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:rounded-[2rem] sm:p-8"
              />
            )}
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/15 bg-card/70 px-4 py-3 backdrop-blur-xl sm:bottom-7 sm:left-7 sm:right-7 sm:px-5 sm:py-4">
              <span className="text-xs font-medium text-white/70 sm:text-sm">{visualAlt || "U:DO CRAFT"}</span>
              <span className="size-2 rounded-full bg-brand shadow-[0_0_16px_rgba(119,114,255,0.9)]" />
            </div>
          </div>
        </div>
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
      >
        <a href="#catalog" aria-label={t("skipToCatalog")} className="hit-44 flex items-center justify-center rounded-full p-2">
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </motion.div>
        </a>
      </motion.div>
    </section>
  );
}
