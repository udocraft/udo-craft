"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShowcaseItem {
  /** Customer wearing U:DO CRAFT clothing. Drop the file in public/auth/ */
  image: string;
  quote: string;
  name: string;
  detail: string;
}

/**
 * Real customers' photos and words only, with their permission. Empty = the login page
 * hides the showcase panel. Entry shape:
 *   { image: "/auth/customer-1.jpg", quote: "…", name: "…", detail: "Місто · виріб" }
 */
export const AUTH_SHOWCASE: ShowcaseItem[] = [];

const ROTATE_MS = 7000;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function AuthShowcase({ items = AUTH_SHOWCASE }: { items?: ShowcaseItem[] }) {
  const t = useTranslations("auth");
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length]);

  const item = items[index];
  if (!item) return null;

  return (
    <div className="relative h-full min-h-[460px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/15 via-muted to-background lg:min-h-[600px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {broken[item.image] ? (
            <div className="flex h-full w-full items-center justify-center">
              <User className="size-40 text-primary/25" strokeWidth={1} />
            </div>
          ) : (
            <img
              src={item.image}
              alt={item.name}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setBroken((b) => ({ ...b, [item.image]: true }))}
            />
          )}

          {/* Comment bubble sitting on top of the photo */}
          <motion.figure
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
            className="absolute left-6 right-6 top-6 m-0 rounded-3xl bg-background p-6 shadow-xl sm:left-10 sm:right-auto sm:max-w-sm"
          >
            <blockquote className="text-base leading-relaxed text-foreground">“{item.quote}”</blockquote>
            <figcaption className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{item.name}</span> · {item.detail}
            </figcaption>
            {/* Speech-bubble tail */}
            <span aria-hidden="true" className="absolute -bottom-2 left-10 size-4 rotate-45 bg-background" />
          </motion.figure>
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {items.map((it, i) => (
            <button
              key={it.image}
              type="button"
              aria-label={t("showcaseItem", { n: i + 1 })}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-[transform,opacity,background-color,border-color,color,box-shadow] duration-300",
                i === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
