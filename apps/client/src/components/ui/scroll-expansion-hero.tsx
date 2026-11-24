"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
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

// Section height: one 100svh sticky stage + 220svh of scroll.
// Phases over that scroll (0..1): expand 0–0.4, hold 0.4–0.55, zoom + shatter 0.55–0.8, zoom out of the copy 0.82–1.
const SECTION_HEIGHT = "320svh";
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

const LETTER_SPREAD_X = 260;
const LETTER_SPREAD_Y = 220;
const PARTICLES_PER_LETTER = 14;

/** Deterministic pseudo-random value in [0, 1) so each letter always breaks the same way. */
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Each letter drifts, spins and shrinks away at its own moment during the expansion. */
function letterStyle(index: number, p: number): CSSProperties {
  const delay = hash(index * 3 + 1) * 0.3;
  const lp = clamp((p - delay) / 0.7);
  if (lp <= 0) return {};
  const dx = (hash(index * 3 + 2) * 2 - 1) * LETTER_SPREAD_X * lp;
  const dy = (hash(index * 3 + 3) * 2 - 1) * LETTER_SPREAD_Y * lp;
  const rot = (hash(index * 3 + 4) * 2 - 1) * 90 * lp;
  return {
    transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${1 - 0.7 * lp})`,
    opacity: 1 - lp,
  };
}

/** Dust particles that burst from each letter while it breaks apart. */
function LetterDust({
  stageRef,
  letterRefs,
  progress,
}: {
  stageRef: RefObject<HTMLDivElement>;
  letterRefs: MutableRefObject<(HTMLSpanElement | null)[]>;
  progress: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !stage || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const stageRect = stage.getBoundingClientRect();
    const width = stageRect.width;
    const height = stageRect.height;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Peaks mid-break and fades out as the starfield takes over.
    const burst = 4 * progress * (1 - progress);
    if (burst <= 0.001) return;

    letterRefs.current.forEach((letter, index) => {
      if (!letter) return;
      const box = letter.getBoundingClientRect();
      if (box.width === 0) return;
      const cx = box.left - stageRect.left + box.width / 2;
      const cy = box.top - stageRect.top + box.height / 2;

      // Small rotated shards that scatter chaotically from each letter.
      for (let k = 0; k < PARTICLES_PER_LETTER; k++) {
        const seed = index * 31 + k * 7;
        const angle = hash(seed + 1) * Math.PI * 2;
        const dist = (30 + hash(seed + 2) * 220) * progress;
        const x = cx + Math.cos(angle) * dist + (hash(seed + 5) - 0.5) * 12 * progress;
        const y = cy + Math.sin(angle) * dist - 40 * progress * hash(seed + 3);
        const size = 0.8 + hash(seed + 4) * 2.4;
        const spin = hash(seed + 6) * Math.PI * 2 + progress * (hash(seed + 7) - 0.5) * 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(spin);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * burst})`;
        ctx.fillRect(-size, -size * 0.35, size * 2, size * 0.7);
        ctx.restore();
      }
    });
  }, [progress, stageRef, letterRefs]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[11] h-full w-full"
    />
  );
}

/**
 * The full-size video zooms in and shatters into tiles. Tiles are drawn from the
 * live video frame, so the break-up starts exactly where the card stops.
 */
function VideoShatter({
  videoRef,
  stageRef,
  zoom,
  cardWidth,
  cardHeight,
}: {
  videoRef: RefObject<HTMLVideoElement>;
  stageRef: RefObject<HTMLDivElement>;
  zoom: number;
  cardWidth: number;
  cardHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !stage || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const stageRect = stage.getBoundingClientRect();
    const width = stageRect.width;
    const height = stageRect.height;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (zoom <= 0 || !video || video.readyState < 2 || video.videoWidth === 0) return;

    // Source crop matching object-cover on the card.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cardRatio = cardWidth / cardHeight;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (vw / vh > cardRatio) {
      sw = vh * cardRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / cardRatio;
      sy = (vh - sh) / 2;
    }

    const cols = 12;
    const rows = 18;
    const cellW = cardWidth / cols;
    const cellH = cardHeight / rows;
    const srcW = sw / cols;
    const srcH = sh / rows;
    const cx = width / 2;
    const cy = height / 2;
    const left = cx - cardWidth / 2;
    const top = cy - cardHeight / 2;
    const scale = 1 + 0.6 * zoom; // zoom-in
    const size = scale * (1 - 0.6 * zoom); // tiles shrink as they fly apart

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const seed = (j * cols + i) * 13 + 1;
        const tx = left + (i + 0.5) * cellW;
        const ty = top + (j + 0.5) * cellH;
        const dx = tx - cx;
        const dy = ty - cy;
        const len = Math.hypot(dx, dy) || 1;
        const spread = zoom * (120 + hash(seed) * 280);
        const x = cx + dx * scale + (dx / len) * spread + (hash(seed + 1) - 0.5) * 40 * zoom;
        const y = cy + dy * scale + (dy / len) * spread - 30 * zoom * hash(seed + 2);
        const rot = (hash(seed + 3) - 0.5) * 2.4 * zoom;

        ctx.save();
        ctx.globalAlpha = 1 - 0.85 * zoom;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(size, size);
        ctx.drawImage(video, sx + i * srcW, sy + j * srcH, srcW, srcH, -cellW / 2, -cellH / 2, cellW, cellH);
        ctx.restore();
      }
    }
  }, [zoom, cardWidth, cardHeight, stageRef, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[12] h-full w-full"
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

  // Phase values derived from the scroll progress (see SECTION_HEIGHT).
  const p = reduceMotion ? 1 : smoothstep(0, 0.4, progress); // expansion
  const zoom = reduceMotion ? 0 : smoothstep(0.55, 0.8, progress); // zoom-in + shatter
  const zoomOut = reduceMotion ? 1 : smoothstep(0.82, 1, progress); // hero copy zooms out into place
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
  // The card is replaced by shattering tiles once the zoom starts.
  const cardOpacity = zoom > 0 ? 0 : 1;
  const starOpacity = smoothstep(0.35, 1, p);

  // Letters break apart only when motion is allowed.
  const letterProgress = reduceMotion ? 0 : p;
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const chars = rows.map((row) => Array.from(row));
  let charOffset = 0;
  const rowStarts = chars.map((row) => {
    const start = charOffset;
    charOffset += row.length;
    return start;
  });

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
              style={{ opacity: 0.12 }}
              aria-hidden="true"
            />
          </div>

          <h1
            className="relative z-10 flex flex-col items-center px-4 text-center font-semibold leading-[0.94] tracking-[-0.055em] drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]"
            style={{ fontSize: "clamp(2.75rem, 6.2vw, 6.5rem)" }}
          >
            {rows.map((_, i) => (
              <span
                key={i}
                className="block whitespace-nowrap will-change-transform"
                style={{ transform: `translateX(${i % 2 === 0 ? -slide : slide}vw)` }}
              >
                {chars[i].map((char, j) => {
                  const index = rowStarts[i] + j;
                  return (
                    <span
                      key={j}
                      ref={(el) => {
                        letterRefs.current[index] = el;
                      }}
                      className="inline-block will-change-transform"
                      style={letterStyle(index, letterProgress)}
                    >
                      {char === " " ? " " : char}
                    </span>
                  );
                })}
              </span>
            ))}
          </h1>

          <LetterDust stageRef={stageRef} letterRefs={letterRefs} progress={letterProgress} />

          <VideoShatter
            videoRef={videoRef}
            stageRef={stageRef}
            zoom={zoom}
            cardWidth={width}
            cardHeight={height}
          />

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
        {/* Hero copy sits in the pinned stage and zooms out into place at the end. */}
        {!reduceMotion && children && (
          <div
            className="absolute inset-0 z-[15] flex items-center justify-center overflow-hidden"
            style={{
              opacity: zoomOut,
              transform: `scale(${1.15 - 0.15 * zoomOut})`,
              visibility: zoomOut > 0 ? "visible" : "hidden",
            }}
          >
            {children}
          </div>
        )}
        </div>
      </section>

      {reduceMotion && children && (
        <div className="relative z-10 bg-[#0d1020] text-white">{children}</div>
      )}
    </>
  );
}
