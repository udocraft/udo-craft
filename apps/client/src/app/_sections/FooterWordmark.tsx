"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { LOGO_SHAPES, LOGO_STROKES, LOGO_VIEWBOX, SIGNATURE_SHAPES, SIGNATURE_STROKES, SIGNATURE_VIEWBOX } from "./signature-data";
import styles from "./FooterWordmark.module.css";

/** Logo: every letter fills over the same time, each starting a beat after the previous one (ease-out). */
const LOGO_FILL_S = 1.2;
const LOGO_STAGGER_S = 0.09;
/** Lettering: starts while the logo settles; total pen time is split by stroke length (one pen speed). */
const SIG_START_S = 0.9;
const SIG_WRITE_S = 2.8;
/** Pen lift between lettering strokes. */
const LIFT_S = 0.06;

function polylineLength(d: string) {
  const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  let len = 0;
  for (let i = 2; i + 1 < n.length; i += 2) len += Math.hypot(n[i] - n[i - 2], n[i + 1] - n[i - 1]);
  return len;
}

type Timing = { delay: number; dur: number };

/** Lays strokes end to end from `start`, with durations proportional to length. */
function timeline(lengths: number[], total: number, start: number): Timing[] {
  const sum = lengths.reduce((a, b) => a + b, 0);
  return lengths.reduce<Timing[]>((acc, len, i) => {
    const dur = (len / sum) * total;
    const delay = i === 0 ? start : acc[i - 1].delay + acc[i - 1].dur + LIFT_S;
    acc.push({ delay, dur });
    return acc;
  }, []);
}

const end = (t: Timing[]) => t[t.length - 1].delay + t[t.length - 1].dur;
const LOGO_TIMING: Timing[] = LOGO_STROKES.map((s) => {
  const after = s.after ?? 0;
  return { delay: s.slot * LOGO_STAGGER_S + after * LOGO_FILL_S, dur: LOGO_FILL_S * (1 - after) };
});
const LOGO_END_S = Math.max(...LOGO_TIMING.map((t) => t.delay + t.dur));
const SIG_TIMING = timeline(SIGNATURE_STROKES.map(polylineLength), SIG_WRITE_S, SIG_START_S);
const SIG_END_S = end(SIG_TIMING);

const timingStyle = (t: Timing) => ({ ["--delay" as string]: `${t.delay}s`, ["--dur" as string]: `${t.dur}s` });

type Phase = "idle" | "armed" | "play";

/**
 * Closing footer wordmark: the faint, full U:DO logo fills in (all letters together, slightly
 * staggered, easing out), then "what you love ♥" is written across it stroke by stroke in spray paint.
 *
 * The server renders the finished state ("idle"), so without JS or with reduced motion nothing
 * is hidden. On mount the client arms the animation, and it plays once when half of it is in view.
 */
export function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [phase, setPhase] = useState<Phase>("idle");
  const uid = useId().replace(/:/g, "");
  const logoMaskId = `logo-mask-${uid}`;
  const maskId = `sig-mask-${uid}`;
  const paintId = `sig-paint-${uid}`;
  const logoFeatherId = `logo-feather-${uid}`;
  const sigFeatherId = `sig-feather-${uid}`;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase((p) => (p === "idle" ? "armed" : p));
  }, []);

  useEffect(() => {
    if (inView && phase === "armed") setPhase("play");
  }, [inView, phase]);

  return (
    <div ref={ref} aria-hidden="true" data-phase={phase} className={`${styles.root} relative`}>
      <svg viewBox={LOGO_VIEWBOX} className="block h-auto w-full" fill="none">
        <defs>
          {/* Blurring the mask feathers each stroke's moving tip, so the fill fades into the background. */}
          <filter id={logoFeatherId} filterUnits="userSpaceOnUse" x="-40" y="-40" width="860" height="320">
            <feGaussianBlur stdDeviation={8} />
          </filter>
          <mask id={logoMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="780" height="240">
            <rect width="780" height="240" fill="#000" />
            <g fill="none" stroke="#fff" strokeLinejoin="round" filter={`url(#${logoFeatherId})`}>
              {LOGO_STROKES.map((s, i) => (
                <path key={i} d={s.d} strokeWidth={s.width} strokeLinecap={s.cap} pathLength={1} className={`${styles.stroke} ${styles.logoStroke}`} style={timingStyle(LOGO_TIMING[i])} />
              ))}
            </g>
            <rect width="780" height="240" fill="#fff" className={styles.settle} style={{ ["--at" as string]: `${LOGO_END_S}s` }} />
          </mask>
        </defs>
        <g fill="currentColor" opacity={0.15} mask={`url(#${logoMaskId})`}>
          {LOGO_SHAPES.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>

      <svg
        viewBox={SIGNATURE_VIEWBOX}
        className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 -rotate-2"
        fill="none"
      >
        <defs>
          <filter id={sigFeatherId} filterUnits="userSpaceOnUse" x="-30" y="-30" width="810" height="311">
            <feGaussianBlur stdDeviation={5} />
          </filter>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="750" height="251">
            <rect width="750" height="251" fill="#000" />
            <g fill="none" stroke="#fff" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${sigFeatherId})`}>
              {SIGNATURE_STROKES.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  pathLength={1}
                  className={styles.stroke}
                  style={timingStyle(SIG_TIMING[i])}
                />
              ))}
            </g>
            {/* Fades in at the very end so anti-aliased letter edges are fully shown. */}
            <rect width="750" height="251" fill="#fff" className={styles.settle} style={{ ["--at" as string]: `${SIG_END_S}s` }} />
          </mask>
          {/*
            Spray paint look, applied after the mask so it builds up as the strokes are written:
            ragged edges (displacement), uneven paint density (grain in the alpha), and a speckled
            overspray haze around the strokes. Noise is in viewBox units, so it scales with the SVG.
          */}
          <filter id={paintId} x="-4%" y="-8%" width="108%" height="116%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={3} result="edgeNoise" />
            <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale={5} xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves={1} seed={7} result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.1 0 0 0 1.45" result="grainAlpha" />
            <feComposite in="rough" in2="grainAlpha" operator="in" result="paint" />
            <feMorphology in="rough" operator="dilate" radius={2} result="fat" />
            <feGaussianBlur in="fat" stdDeviation={6} result="haze" />
            <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves={1} seed={11} result="dots" />
            <feColorMatrix in="dots" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -8.2" result="dotsAlpha" />
            <feComposite in="haze" in2="dotsAlpha" operator="in" result="spray" />
            <feColorMatrix in="spray" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0" result="overspray" />
            <feMerge>
              <feMergeNode in="overspray" />
              <feMergeNode in="paint" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#${paintId})`}>
        <g fill="#BD6161" mask={`url(#${maskId})`}>
          {SIGNATURE_SHAPES.map((s, i) => (
            <path key={i} d={s.d} fillRule={s.evenOdd ? "evenodd" : undefined} clipRule={s.evenOdd ? "evenodd" : undefined} />
          ))}
        </g>
        </g>
      </svg>
    </div>
  );
}
