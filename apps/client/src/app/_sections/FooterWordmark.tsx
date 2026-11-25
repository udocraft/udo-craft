"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { BrandLogoFull } from "@/components/brand-logo";
import { SIGNATURE_SHAPES, SIGNATURE_STROKES, SIGNATURE_VIEWBOX } from "./signature-data";
import styles from "./FooterWordmark.module.css";

/** Logo reveal (top to bottom, with a shimmer band riding the edge). */
const REVEAL_S = 1.1;
/** The lettering starts just before the reveal ends. */
const WRITE_START_S = 1.0;
/** Total pen time for all strokes, split by stroke length so the pen moves at one speed. */
const WRITE_S = 2.8;
/** Pen lift between strokes. */
const LIFT_S = 0.06;

function polylineLength(d: string) {
  const n = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  let len = 0;
  for (let i = 2; i + 1 < n.length; i += 2) len += Math.hypot(n[i] - n[i - 2], n[i + 1] - n[i - 1]);
  return len;
}

const LENGTHS = SIGNATURE_STROKES.map(polylineLength);
const TOTAL_LEN = LENGTHS.reduce((a, b) => a + b, 0);
const TIMING = LENGTHS.reduce<{ delay: number; dur: number }[]>((acc, len, i) => {
  const dur = (len / TOTAL_LEN) * WRITE_S;
  const delay = i === 0 ? WRITE_START_S : acc[i - 1].delay + acc[i - 1].dur + LIFT_S;
  acc.push({ delay, dur });
  return acc;
}, []);
const WRITE_END_S = TIMING[TIMING.length - 1].delay + TIMING[TIMING.length - 1].dur;

type Phase = "idle" | "armed" | "play";

/**
 * Closing footer wordmark: the faint, full U:DO logo is revealed top to bottom with a
 * shimmer, then "what you love ♥" is written over it stroke by stroke.
 *
 * The server renders the finished state ("idle"), so without JS or with reduced motion nothing
 * is hidden. On mount the client arms the animation, and it plays once when half of it is in view.
 */
export function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [phase, setPhase] = useState<Phase>("idle");
  const uid = useId().replace(/:/g, "");
  const maskId = `sig-mask-${uid}`;
  const paintId = `sig-paint-${uid}`;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase((p) => (p === "idle" ? "armed" : p));
  }, []);

  useEffect(() => {
    if (inView && phase === "armed") setPhase("play");
  }, [inView, phase]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-phase={phase}
      className={`${styles.root} relative`}
      style={{ ["--reveal" as string]: `${REVEAL_S}s`, ["--write-end" as string]: `${WRITE_END_S}s` }}
    >
      <div className={`${styles.reveal} opacity-15`}>
        <BrandLogoFull className="block h-auto w-full" color="currentColor" />
      </div>
      <div className={`${styles.shine} absolute inset-0 opacity-50`}>
        <BrandLogoFull className="block h-auto w-full" color="currentColor" />
      </div>

      <svg
        viewBox={SIGNATURE_VIEWBOX}
        className="absolute left-1/2 top-[46%] w-[58%] -translate-x-1/2 -translate-y-1/2 -rotate-3"
        fill="none"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="750" height="251">
            <rect width="750" height="251" fill="#000" />
            <g fill="none" stroke="#fff" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round">
              {SIGNATURE_STROKES.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  pathLength={1}
                  className={styles.stroke}
                  style={{ ["--delay" as string]: `${TIMING[i].delay}s`, ["--dur" as string]: `${TIMING[i].dur}s` }}
                />
              ))}
            </g>
            {/* Fades in at the very end so anti-aliased letter edges are fully shown. */}
            <rect width="750" height="251" fill="#fff" className={styles.settle} />
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
