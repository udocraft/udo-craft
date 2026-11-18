"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface ScrollExpandMediaProps {
  mediaSrc: string;
  posterSrc?: string;
  title: string;
  ariaLabel?: string;
  /** Unmute the video when the visitor scrolls (falls back to the first click/tap/key press if the browser blocks it). */
  audioOnScroll?: boolean;
  soundOnLabel?: string;
  soundOffLabel?: string;
  children?: ReactNode;
}

// Section height: one 100svh sticky stage + 120svh of scroll that drives the expansion.
const SECTION_HEIGHT = "220svh";
const BASE_WIDTH = 300;
const BASE_RATIO = 4 / 3;
const VIDEO_VOLUME = 0.8;

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/**
 * Splits a title into at most `maxRows` balanced rows (contiguous words, minimal
 * squared deviation from the average row length).
 */
function splitRows(title: string, maxRows: number): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const n = Math.min(maxRows, words.length);
  if (n <= 1) return [words.join(" ")];

  const lengths = words.map((w) => w.length);
  const total = lengths.reduce((a, b) => a + b, 0) + words.length - 1;
  const target = total / n;
  const rowCost = (from: number, to: number) => {
    const len = lengths.slice(from, to).reduce((a, b) => a + b, 0) + (to - from - 1);
    return (len - target) ** 2;
  };

  // dp[k][i]: best cost of splitting the first i words into k rows.
  const W = words.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(Infinity));
  const cut: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  dp[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let i = k; i <= W; i++) {
      for (let j = k - 1; j < i; j++) {
        const cost = dp[k - 1][j] + rowCost(j, i);
        if (cost < dp[k][i]) {
          dp[k][i] = cost;
          cut[k][i] = j;
        }
      }
    }
  }

  const rows: string[] = [];
  let end = W;
  for (let k = n; k >= 1; k--) {
    const start = cut[k][end];
    rows.unshift(words.slice(start, end).join(" "));
    end = start;
  }
  return rows;
}

/** Twinkling starfield drawn on a canvas; the expanded video dissolves into it. */
function StarField({ opacity, reduceMotion }: { opacity: number; reduceMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let stars: { x: number; y: number; r: number; speed: number; phase: number }[] = [];
    let raf = 0;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        const alpha = reduceMotion
          ? 0.8
          : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.001 * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((width * height) / 4500), 80, 260);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.3,
        speed: 0.6 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      }));
      if (reduceMotion) draw(0);
    };

    const loop = (time: number) => {
      draw(time);
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (!reduceMotion) raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      style={{ opacity }}
    />
  );
}

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
  audioOnScroll = false,
  soundOnLabel = "Turn sound on",
  soundOffLabel = "Turn sound off",
  children,
}: ScrollExpandMediaProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [progress, setProgress] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [muted, setMuted] = useState(true);

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

  // Keep the React state in sync with the element's real muted state.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setMuted(video.muted);
    sync();
    video.addEventListener("volumechange", sync);
    return () => video.removeEventListener("volumechange", sync);
  }, []);

  // Sound on scroll. Browsers only allow audible playback after a user gesture, so a
  // scroll that is blocked is retried on the next click, tap or key press.
  useEffect(() => {
    if (!audioOnScroll) return;
    const video = videoRef.current;
    if (!video) return;

    let scrollBlocked = false;
    const enableSound = (fromScroll: boolean) => {
      if (!video.muted) return;
      video.muted = false;
      video.volume = VIDEO_VOLUME;
      video.play().catch(() => {
        video.muted = true;
        if (fromScroll) scrollBlocked = true;
      });
    };
    const onScroll = () => {
      if (!scrollBlocked && window.scrollY > 40) enableSound(true);
    };
    const onGesture = () => {
      scrollBlocked = false;
      enableSound(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const gestures = ["pointerdown", "keydown", "touchstart"] as const;
    gestures.forEach((type) => window.addEventListener(type, onGesture, { passive: true }));
    return () => {
      window.removeEventListener("scroll", onScroll);
      gestures.forEach((type) => window.removeEventListener(type, onGesture));
    };
  }, [audioOnScroll]);

  // Pause when the hero leaves the screen so sound does not carry into the catalog.
  useEffect(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted) {
      video.volume = VIDEO_VOLUME;
      video.play().catch(() => {
        video.muted = true;
      });
    }
  };

  const p = reduceMotion ? 1 : progress;
  const vw = viewport.w || 1024;
  const vh = viewport.h || 768;
  const isMobile = vw < 768;

  const baseWidth = Math.min(BASE_WIDTH, vw * 0.8);
  const baseHeight = baseWidth * BASE_RATIO;
  const width = baseWidth + p * (vw - baseWidth);
  const height = baseHeight + p * (vh - baseHeight);
  const radius = (1 - p) * 24;
  const slide = p * (isMobile ? 120 : 150); // rows slide apart (vw); odd rows left, even rows right
  const rows = splitRows(title, 3);
  // The video card dissolves into the starfield during the second half of the expansion.
  const cardOpacity = 1 - smoothstep(0.55, 1, p) * 0.9;
  const starOpacity = smoothstep(0.35, 1, p);

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

          <StarField opacity={starOpacity} reduceMotion={reduceMotion} />

          <div
            className="absolute left-1/2 top-1/2 z-0 overflow-hidden"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              borderRadius: `${radius}px`,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 ${50 * (1 - p)}px rgba(0, 0, 0, 0.3)`,
              opacity: cardOpacity,
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
            {rows.map((row, i) => (
              <span
                key={i}
                className="block whitespace-nowrap will-change-transform"
                style={{ transform: `translateX(${i % 2 === 0 ? -slide : slide}vw)` }}
              >
                {row}
              </span>
            ))}
          </h1>

          {audioOnScroll && (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? soundOnLabel : soundOffLabel}
              className="absolute bottom-6 right-6 z-20 flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
            </button>
          )}
        </div>
      </section>

      {children && (
        <div className="relative z-10 bg-[#0d1020] text-white">{children}</div>
      )}
    </>
  );
}
