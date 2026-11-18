"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollExpandMediaProps {
  mediaSrc: string;
  posterSrc?: string;
  title: string;
  ariaLabel?: string;
  children?: ReactNode;
}

// Section height: one 100svh sticky stage + 120svh of scroll that drives the expansion.
const SECTION_HEIGHT = "220svh";
const BASE_WIDTH = 300;
const BASE_RATIO = 4 / 3;

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

/**
 * Scroll-driven expanding video hero.
 * Progress is read from the page's own scroll position (no wheel/touch hijacking),
 * so keyboard, scrollbar and screen-reader navigation keep working.
 */
export function ScrollExpandMedia({
  mediaSrc,
  posterSrc,
  title,
  ariaLabel,
  children,
}: ScrollExpandMediaProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [progress, setProgress] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  // Viewport size + reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduceMotion(mq.matches);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // Map section scroll position to 0..1 progress.
  useEffect(() => {
    if (reduceMotion) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return;
      const range = section.offsetHeight - stage.offsetHeight;
      if (range <= 0) return;
      const top = section.getBoundingClientRect().top;
      setProgress(clamp(-top / range));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduceMotion]);

  // Muted autoplay is allowed, but retry once in case the browser deferred it.
  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const p = reduceMotion ? 1 : progress;
  const vw = viewport.w || 1024;
  const vh = viewport.h || 768;
  const isMobile = vw < 768;

  const baseWidth = Math.min(BASE_WIDTH, vw * 0.8);
  const baseHeight = baseWidth * BASE_RATIO;
  const width = baseWidth + p * (vw - baseWidth);
  const height = baseHeight + p * (vh - baseHeight);
  const radius = (1 - p) * 24;
  const slide = p * (isMobile ? 120 : 150); // title halves slide apart (vw)

  const [firstWord, ...rest] = title.split(" ");
  const restOfTitle = rest.join(" ");

  return (
    <>
    <section
      ref={sectionRef}
      aria-label={ariaLabel}
      className="relative bg-[#0d1020] text-white"
      style={reduceMotion ? undefined : { height: SECTION_HEIGHT }}
    >
      <div
        ref={stageRef}
        className={`${reduceMotion ? "relative" : "sticky top-0"} flex h-[100svh] w-full items-center justify-center overflow-hidden`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(115,111,255,0.3),transparent_60%)]"
          style={{ opacity: 1 - p * 0.6 }}
          aria-hidden="true"
        />

        <div
          className="absolute left-1/2 top-1/2 z-0 overflow-hidden"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            borderRadius: `${radius}px`,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${50 * (1 - p)}px rgba(0, 0, 0, 0.3)`,
          }}
        >
          <video
            ref={videoRef}
            src={mediaSrc}
            poster={posterSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
            className="pointer-events-none h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: 0.4 - p * 0.3 }}
            aria-hidden="true"
          />
        </div>

        <h1
          className="relative z-10 flex flex-col items-center px-4 text-center font-semibold leading-[0.94] tracking-[-0.055em] drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]"
          style={{ fontSize: "clamp(2.75rem, 6.2vw, 6.5rem)" }}
        >
          <span
            className="block will-change-transform"
            style={{ transform: `translateX(-${slide}vw)` }}
          >
            {firstWord}
          </span>
          <span
            className="block will-change-transform"
            style={{ transform: `translateX(${slide}vw)` }}
          >
            {restOfTitle}
          </span>
          </h1>
      </div>
    </section>

    {children && (
      <div className="relative z-10 bg-[#0d1020] text-white">{children}</div>
    )}
    </>
  );
}
