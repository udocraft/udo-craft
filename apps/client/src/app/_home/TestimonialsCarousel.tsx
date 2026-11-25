"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, SectionHeader } from "@udo-craft/ui";
import type { Testimonial } from "./testimonials-data";

interface Labels { eyebrow: string; heading: string; list: string; prev: string; next: string }

/**
 * Edge-to-edge row of square photos, no gaps or card chrome, with the quote over the
 * bottom of each photo. The pager below matches the catalogue's (outline icon buttons, a
 * position counter, disabled at the ends, no looping) and follows swipe/trackpad scrolling.
 */
export function TestimonialsCarousel({ items, labels }: { items: Testimonial[]; labels: Labels }) {
  const track = useRef<HTMLUListElement>(null);
  // Position of the first visible photo, and how many positions the row can scroll through.
  const [pos, setPos] = useState(0);
  const [positions, setPositions] = useState(items.length);

  const sync = useCallback(() => {
    const el = track.current;
    const item = el?.firstElementChild as HTMLElement | null;
    if (!el || !item) return;
    const w = item.offsetWidth;
    setPositions(Math.max(1, Math.round((el.scrollWidth - el.clientWidth) / w) + 1));
    setPos(Math.round(el.scrollLeft / w));
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    const item = el?.firstElementChild as HTMLElement | null;
    if (!el || !item) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * item.offsetWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-gutter">
        <SectionHeader
          titleId="reviews-heading"
          eyebrow={labels.eyebrow}
          title={labels.heading}
        />
      </div>
      <ul
        id="reviews-track"
        ref={track}
        onScroll={sync}
        aria-label={labels.list}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <li key={`${item.image}-${i}`} className="relative aspect-square w-[92%] shrink-0 snap-start sm:w-1/2 lg:w-1/3">
            <figure className="absolute inset-0 flex flex-col justify-end bg-muted">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="relative p-6 text-white sm:p-8">
                <blockquote className="text-h4 font-medium text-pretty">“{item.quote}”</blockquote>
                <figcaption className="mt-4">
                  <span className="block text-base font-semibold">{item.name}</span>
                  <span className="block text-sm text-white/70">{item.detail}</span>
                </figcaption>
              </div>
            </figure>
          </li>
        ))}
      </ul>
      {positions > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4" aria-label={labels.heading}>
          <Button variant="outline" size="icon" aria-label={labels.prev} aria-controls="reviews-track" disabled={pos === 0} onClick={() => step(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {pos + 1} / {positions}
          </span>
          <Button variant="outline" size="icon" aria-label={labels.next} aria-controls="reviews-track" disabled={pos >= positions - 1} onClick={() => step(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </>
  );
}
