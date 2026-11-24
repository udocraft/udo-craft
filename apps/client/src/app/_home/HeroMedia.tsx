"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Play, X } from "lucide-react";

const OPEN_DELAY_MS = 900;
const HOLD_MS = 3500;

/**
 * Hero client island: the muted background loop and the fullscreen "watch the
 * video" overlay. Everything else in the hero is server-rendered.
 * Must sit inside a `relative` hero section.
 */
export function HeroMedia() {
  const t = useTranslations("hero");
  const [cinema, setCinema] = useState(false);
  const [showLoop, setShowLoop] = useState(false);
  // The play button loads as an icon, opens into "Show the process" once the hero is
  // on screen, then closes back to the icon. Hover and focus open it again.
  const [phase, setPhase] = useState<"idle" | "open" | "done">("idle");
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el || phase === "done") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (!entry.isIntersecting) return;
        timer =
          phase === "idle"
            ? setTimeout(() => setPhase("open"), OPEN_DELAY_MS)
            : setTimeout(() => setPhase("done"), HOLD_MS);
      },
      { threshold: 1 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [phase]);

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
        data-open={phase === "open" || undefined}
        onClick={() => { setPhase("done"); setCinema((v) => !v); }}
        aria-label={cinema ? t("closeVideo") : undefined}
        className={`group ${cinema ? "z-[9999]" : "z-10"} grid h-11 grid-cols-[1rem_0fr] items-center rounded-full border border-border bg-background/70 px-[13px] text-foreground backdrop-blur-md transition-[grid-template-columns,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
          cinema
            ? "fixed bottom-6 right-4 md:right-6"
            : "absolute bottom-6 right-4 data-[open]:grid-cols-[1rem_1fr] hover:grid-cols-[1rem_1fr] focus-visible:grid-cols-[1rem_1fr] md:right-6"
        }`}
      >
        {cinema ? (
          <X className="size-4" aria-hidden="true" />
        ) : (
          <>
            <Play className="size-4 fill-current" aria-hidden="true" />
            <span className="min-w-0 overflow-hidden">
              {/* Text fades in after the width opens and out before it closes. */}
              <span className="block whitespace-nowrap pl-2 pr-1 text-sm font-medium opacity-0 blur-[2px] transition-[opacity,filter] duration-200 ease-out group-hover:opacity-100 group-hover:blur-0 group-hover:delay-150 group-focus-visible:opacity-100 group-focus-visible:blur-0 group-focus-visible:delay-150 group-data-[open]:opacity-100 group-data-[open]:blur-0 group-data-[open]:delay-150 motion-reduce:transition-none">
                {t("showProcess")}
              </span>
            </span>
          </>
        )}
      </button>
    </>
  );
}
