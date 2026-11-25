"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";

interface MaterialSectionProps {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  properties: { icon: LucideIcon; label: string }[];
}

/**
 * Full-bleed material story (reference 7): one image edge to edge, a dark scrim,
 * a centred title with a row of property icons and a short paragraph bottom-left.
 */
export function MaterialSection({ id, title, body, imageUrl, properties }: MaterialSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative isolate flex min-h-[85dvh] scroll-mt-32 flex-col overflow-hidden bg-surface-dark text-white">
      {imageUrl && (
        <Image src={imageUrl} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-60 scale-110 blur-[2px]" />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h2 id={`${id}-title`} className="max-w-3xl text-[clamp(2rem,4vw,3.5rem)] font-medium leading-tight tracking-[-0.03em]">
            {title}
          </h2>
          {properties.length > 0 && (
            <ul className="mt-14 grid w-full max-w-4xl grid-cols-2 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {properties.map(({ icon: Icon, label }) => (
                <li key={label} className="flex flex-col items-center gap-4 px-2">
                  <Icon className="size-12" strokeWidth={1.4} aria-hidden="true" />
                  <span className="text-sm tracking-wide text-white/90">{label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-16 max-w-xl text-lg leading-relaxed text-white/90">{body}</p>
      </div>
    </section>
  );
}
