"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface StatementSectionProps {
  /** Up to three product image URLs shown as pills inside the sentence. */
  images: string[];
}

/** One word that fills from muted to foreground as the section scrolls through. */
function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}

function Pill({ src }: { src?: string }) {
  if (!src) return null;
  return (
    <span
      aria-hidden="true"
      className="mx-[0.15em] inline-block h-[0.82em] w-[1.5em] translate-y-[0.08em] overflow-hidden rounded-full bg-muted align-baseline"
    >
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
    </span>
  );
}

/**
 * Editorial statement: a single large sentence with product pills set inline,
 * filling in word by word on scroll (reference 1).
 */
export function StatementSection({ images }: StatementSectionProps) {
  const t = useTranslations("editorial.statement");
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });

  // Sentence split into chunks; pills sit between chunks.
  const chunks = [t("before1") + " " + t("after1"), t("after2"), t("after3") + " " + t("after4")];
  const words = chunks.map((c) => c.split(/\s+/).filter(Boolean));
  const total = words.flat().length;
  let index = 0;

  return (
    <section ref={ref} aria-labelledby="statement-heading" className="bg-background py-28 sm:py-40">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 text-center sm:px-6 lg:px-10">
        <p className="mb-8 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">{t("eyebrow")}</p>
        <h2
          id="statement-heading"
          className="text-[clamp(1.875rem,4.6vw,4rem)] font-medium leading-[1.12] tracking-[-0.035em] text-foreground text-balance"
        >
          {/* Screen readers get the plain sentence once. */}
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
                {gi < words.length && <Pill src={images[gi]} />}{" "}
              </span>
            ))}
          </span>
        </h2>
        <Link
          href="/#about"
          className="mt-14 inline-flex min-h-12 items-center gap-2 rounded-full bg-foreground px-7 text-base font-medium text-background transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("cta")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
