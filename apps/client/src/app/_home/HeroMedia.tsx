"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Play, X } from "lucide-react";

const OPEN_DELAY_MS = 900;
const HOLD_MS = 3500;
/** Circle reveal. Close is a little quicker than open, like a drawer. */
const REVEAL_MS = 800;
const HIDE_MS = 600;
const REVEAL_EASE = "cubic-bezier(0.22,1,0.36,1)";

type Stage = "closed" | "enter" | "open" | "exit";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Hero client island: the muted background loop and the fullscreen "watch the
 * video" overlay. Everything else in the hero is server-rendered.
 * Must sit inside a `relative` hero section.
 */
export function HeroMedia() {
  const t = useTranslations("hero");
  // closed → enter (mounted, circle at 0) → open (circle grown) → exit (shrinking) → closed
  const [stage, setStage] = useState<Stage>("closed");
  const [origin, setOrigin] = useState({ x: "100%", y: "100%" });
  const cinema = stage !== "closed";
  const closeRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [showLoop, setShowLoop] = useState(false);
  // Background loop and full video are the same 11 s footage (640×480 vs 1280×960),
  // so the full video starts where the loop is, and the loop resumes where it stopped.
  const loopRef = useRef<HTMLVideoElement>(null);
  const fullRef = useRef<HTMLVideoElement | null>(null);
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

  // The background loop (muted) plays on wide screens, also with reduced motion on:
  // it is a slow, low-contrast backdrop and a product decision. It is skipped on
  // phones and with data saver, so no video bytes are spent there.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setShowLoop(window.matchMedia("(min-width: 768px)").matches && !conn?.saveData);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const openCinema = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) setOrigin({ x: `${r.left + r.width / 2}px`, y: `${r.top + r.height / 2}px` });
    setPhase("done");
    setStage("enter");
    // Two frames: let the closed circle paint once so the grow is a real transition.
    requestAnimationFrame(() => requestAnimationFrame(() => setStage("open")));
  };

  const closeCinema = useCallback(() => {
    // Hand the playhead back to the background loop.
    const full = fullRef.current;
    const loop = loopRef.current;
    if (full && loop && Number.isFinite(full.currentTime)) {
      loop.currentTime = full.currentTime % (loop.duration || full.duration || 11);
      void loop.play().catch(() => {});
    }
    setStage((cur) => (cur === "open" || cur === "enter" ? "exit" : cur));
    timers.current.push(
      setTimeout(() => {
        setStage("closed");
        buttonRef.current?.focus({ preventScroll: true });
      }, prefersReducedMotion() ? 0 : HIDE_MS),
    );
  }, []);

  useEffect(() => {
    if (!cinema) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCinema();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [cinema, closeCinema]);

  useEffect(() => {
    if (stage === "open") closeRef.current?.focus({ preventScroll: true });
  }, [stage]);

  // Stable ref: an inline callback would re-run play() on every render.
  const playFullVideo = useCallback((el: HTMLVideoElement | null) => {
    fullRef.current = el;
    if (!el) return;
    // Continue from where the background loop is now.
    const start = loopRef.current?.currentTime ?? 0;
    const seekAndPlay = () => {
      if (start > 0 && start < (el.duration || Infinity)) el.currentTime = start;
      el.muted = false;
      el.volume = 0.8;
      el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    };
    if (el.readyState >= 1) seekAndPlay();
    else el.addEventListener("loadedmetadata", seekAndPlay, { once: true });
  }, []);

  const shown = stage === "open";

  return (
    <>
      {showLoop && (
      <>
      <video
        ref={loopRef}
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-50"
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
      {/* Scrim: keeps the white headline readable over the brighter video. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgb(0_0_0/0.45),rgb(0_0_0/0.15)_70%,transparent)]"
      />
      </>
      )}

      {cinema && (
        <div
          className="fixed inset-0 z-[9998] bg-black motion-reduce:transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-label={t("fullscreenVideo")}
          style={{
            clipPath: `circle(${shown ? "150%" : "0px"} at ${origin.x} ${origin.y})`,
            transition: `clip-path ${shown ? REVEAL_MS : HIDE_MS}ms ${REVEAL_EASE}`,
          }}
        >
          <video
            ref={playFullVideo}
            className="absolute inset-0 size-full object-cover will-change-transform"
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? "scale(1)" : "scale(1.12)",
              transition: shown
                ? `opacity 500ms ease-out 250ms, transform ${REVEAL_MS + 200}ms ${REVEAL_EASE}`
                : `opacity 250ms ease-in, transform ${HIDE_MS}ms ${REVEAL_EASE}`,
            }}
            src="/hero-video.mp4"
            poster="/hero-poster.jpg"
            preload="auto"
            loop
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
          />
          <button
            ref={closeRef}
            type="button"
            onClick={closeCinema}
            aria-label={t("closeVideo")}
            className="absolute bottom-6 right-4 flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md transition-[background-color,opacity] hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-6"
            style={{ opacity: shown ? 1 : 0, transitionDuration: shown ? "400ms" : "150ms", transitionDelay: shown ? "450ms" : "0ms" }}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        data-open={phase === "open" || undefined}
        onClick={openCinema}
        className="group absolute bottom-6 right-4 z-10 grid h-11 grid-cols-[1rem_0fr] items-center rounded-full border border-border bg-background/70 px-[13px] text-foreground backdrop-blur-md transition-[grid-template-columns,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-muted hover:grid-cols-[1rem_1fr] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:grid-cols-[1rem_1fr] data-[open]:grid-cols-[1rem_1fr] motion-reduce:transition-none md:right-6"
      >
        <Play className="size-4 fill-current" aria-hidden="true" />
        <span className="min-w-0 overflow-hidden">
          {/* Text fades in after the width opens and out before it closes. */}
          <span className="block whitespace-nowrap pl-2 pr-1 text-sm font-medium opacity-0 blur-[2px] transition-[opacity,filter] duration-200 ease-out group-hover:opacity-100 group-hover:blur-none group-hover:delay-150 group-focus-visible:opacity-100 group-focus-visible:blur-none group-focus-visible:delay-150 group-data-[open]:opacity-100 group-data-[open]:blur-none group-data-[open]:delay-150 motion-reduce:transition-none">
            {t("showProcess")}
          </span>
        </span>
      </button>
    </>
  );
}
