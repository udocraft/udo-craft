"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Play, X } from "lucide-react";

const PEEK_MS = 4000;

/**
 * Hero client island: the muted background loop and the fullscreen "watch the
 * video" overlay. Everything else in the hero is server-rendered.
 * Must sit inside a `relative` hero section.
 */
export function HeroMedia() {
  const t = useTranslations("hero");
  const [cinema, setCinema] = useState(false);
  const [showLoop, setShowLoop] = useState(false);
  // The play button opens as a labelled pill, then folds into a circle once the
  // hero has been on screen for a few seconds. Hover and focus open it again.
  const [peek, setPeek] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el || !peek) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (entry.isIntersecting) timer = setTimeout(() => setPeek(false), PEEK_MS);
      },
      { threshold: 1 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [peek]);

  // The background loop is decoration: only load it on wide screens, when the
  // visitor has not asked for reduced motion or reduced data. No bytes otherwise.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const ok =
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !conn?.saveData;
    setShowLoop(ok);
  }, []);

  useEffect(() => {
    if (!cinema) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCinema(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [cinema]);

  return (
    <>
      {showLoop && (
      <video
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-15"
        src="/hero-bg.mp4"
        poster="/hero-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        preload="auto"
        aria-hidden="true"
      />
      )}

      {cinema && (
        <div
          className="fixed inset-0 z-[9998] bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={t("fullscreenVideo")}
        >
          <video
            ref={(el) => {
              if (!el) return;
              el.muted = false;
              el.volume = 0.8;
              el.play().catch(() => {
                el.muted = true;
                el.play().catch(() => {});
              });
            }}
            className="absolute inset-0 size-full object-cover"
            src="/hero-video.mp4"
            poster="/hero-poster.jpg"
            loop
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
          />
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setPeek(false); setCinema((v) => !v); }}
        aria-label={cinema ? t("closeVideo") : undefined}
        className={`group ${cinema ? "z-[9999]" : "z-10"} flex h-11 items-center rounded-full border border-border bg-background/70 px-[13px] text-foreground backdrop-blur-md transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          cinema ? "fixed bottom-6 right-4 md:right-6" : "absolute bottom-6 right-4 md:right-6"
        }`}
      >
        {cinema ? (
          <X className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <>
            <Play className="size-4 shrink-0 fill-current" aria-hidden="true" />
            <span
              className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,opacity,margin] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:ml-2 group-hover:mr-1 group-hover:max-w-56 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:mr-1 group-focus-visible:max-w-56 group-focus-visible:opacity-100 motion-reduce:transition-none ${
                peek ? "ml-2 mr-1 max-w-56 opacity-100" : "ml-0 mr-0 max-w-0 opacity-0"
              }`}
            >
              {t("showProcess")}
            </span>
          </>
        )}
      </button>
    </>
  );
}
