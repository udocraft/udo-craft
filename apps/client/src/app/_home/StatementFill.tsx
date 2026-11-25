"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

/** One word that fills from faint to full as the block scrolls through the viewport. */
function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

function Pill({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <span aria-hidden="true" className="mx-[0.15em] inline-block h-[0.82em] w-[1.5em] translate-y-[0.08em] overflow-hidden rounded-full bg-muted align-baseline">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, sized in em with the text */}
      <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
    </span>
  );
}

/**
 * The statement sentence: chunks of text with product photo pills between them,
 * filling in word by word on scroll. Screen readers get the plain sentence once.
 */
export function StatementFill({ chunks, images, headingId }: { chunks: string[]; images: string[]; headingId: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = chunks.map((c) => c.split(/\s+/).filter(Boolean));
  const total = Math.max(1, words.flat().length);
  let index = 0;

  return (
    <h2 ref={ref} id={headingId} className="text-h1 font-semibold text-balance">
      <span className="sr-only">{chunks.join(" ")}</span>
      <span aria-hidden="true">
        {words.map((group, gi) => (
          <span key={gi}>
            {group.map((w) => {
              const i = index++;
              const start = i / total;
              return reduce
                ? <span key={i}>{w} </span>
                : <Word key={i} progress={scrollYProgress} range={[start, Math.min(1, start + 1.5 / total)]}>{w}</Word>;
            })}
            <Pill src={images[gi]} />{" "}
          </span>
        ))}
      </span>
    </h2>
  );
}
