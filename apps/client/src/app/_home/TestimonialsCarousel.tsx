"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "@udo-craft/ui";
import type { Testimonial } from "./testimonials-data";

interface Labels { eyebrow: string; heading: string; list: string; prev: string; next: string }

const arrowClass =
  "grid size-12 place-items-center rounded-full border border-border text-foreground transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35";

/**
 * Edge-to-edge row of square photos, no gaps or card chrome, with the quote over the
 * bottom of each photo. Chevrons move one photo at a time; swipe and trackpad scroll work too.
 */
export function TestimonialsCarousel({ items, labels }: { items: Testimonial[]; labels: Labels }) {
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
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
          action={
            <div className="flex gap-3">
              <button type="button" onClick={() => step(-1)} disabled={atStart} aria-label={labels.prev} aria-controls="reviews-track" className={arrowClass}>
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => step(1)} disabled={atEnd} aria-label={labels.next} aria-controls="reviews-track" className={arrowClass}>
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          }
        />
      </div>
      <ul
        id="reviews-track"
        ref={track}
        onScroll={sync}
        aria-label={labels.list}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <li key={item.image} className="relative aspect-square w-[85%] shrink-0 snap-start sm:w-1/2 lg:w-1/3 xl:w-1/4">
            <figure className="absolute inset-0 flex flex-col justify-end bg-muted">
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
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
    </>
  );
}
