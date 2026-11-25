"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface GalleryProps {
  images: { key: string; url: string }[];
  alt: string;
  /** Changes when the colour variant changes, so the gallery resets. */
  resetKey: string;
}

/**
 * Full-height product gallery (reference 5).
 * Desktop: thumbnail rail + one large image on an edge-to-edge surface.
 * Mobile: full-bleed swipe carousel with a position counter.
 */
export function ProductGallery({ images, alt, resetKey }: GalleryProps) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [resetKey]);

  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setActive((i) => Math.min(images.length - 1, i + 1)); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
  };

  if (images.length === 0) {
    return <div className="aspect-[4/5] w-full bg-muted lg:h-[calc(100dvh-5rem)] lg:aspect-auto" />;
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <>
      {/* Mobile carousel */}
      <div className="relative lg:hidden">
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          className="flex snap-x snap-mandatory overflow-x-auto bg-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={alt}
        >
          {images.map((img, i) => (
            <div key={img.key + i} className="relative aspect-[4/5] w-full shrink-0 snap-center">
              <Image src={img.url} alt={i === 0 ? alt : ""} fill sizes="100vw" priority={i === 0} className="object-contain p-6" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <p className="absolute bottom-4 right-4 rounded-full bg-background/85 px-3 py-1 text-xs tabular-nums text-foreground backdrop-blur" aria-live="polite">
            {active + 1} / {images.length}
          </p>
        )}
      </div>

      {/* Desktop rail + stage */}
      <div className="hidden h-[calc(100dvh-5rem)] bg-muted lg:flex">
        {images.length > 1 && (
          <div
            role="listbox"
            aria-label={alt}
            aria-orientation="vertical"
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto px-4 py-8 [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {images.map((img, i) => (
              <button
                key={img.key + i}
                type="button"
                role="option"
                aria-selected={i === active}
                aria-label={`${alt} — ${i + 1}`}
                tabIndex={-1}
                onClick={() => setActive(i)}
                className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-background/60 transition-[box-shadow,opacity] ${
                  i === active ? "ring-1 ring-foreground" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            ))}
          </div>
        )}
        <div className="relative flex-1">
          <Image
            key={current.url}
            src={current.url}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-contain p-10 xl:p-16 animate-[fade-in_300ms_ease-out]"
          />
        </div>
      </div>
    </>
  );
}
