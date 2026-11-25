"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

/** How long one step's line takes to fill. */
const FILL_MS = 1600;

/**
 * Three steps whose top lines fill one after another once the list scrolls into view.
 * Steps not reached yet sit at 85% opacity. Reduced motion is handled in CSS
 * (motion-reduce: classes), so server and client render the same markup.
 */
export function StepsProgress({ items }: { items: { title: string; desc: string }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  // Index of the step that is filling now; items.length means all done. -1 = not started.
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    setActive(0);
    const timers = items.map((_, i) => setTimeout(() => setActive(i + 1), FILL_MS * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [inView, items.length]);

  return (
    <ol ref={ref} className="grid gap-10 md:grid-cols-3 md:gap-8">
      {items.map((item, i) => {
        const reached = i <= active;
        return (
          <li
            key={i}
            className={cn(
              "transition-opacity duration-500 motion-reduce:opacity-100 motion-reduce:transition-none",
              reached ? "opacity-100" : "opacity-85",
            )}
          >
            <div className="relative h-px overflow-hidden bg-border" aria-hidden="true">
              <div
                className={cn(
                  "absolute inset-0 origin-left bg-foreground ease-linear motion-reduce:scale-x-100 motion-reduce:transition-none",
                  reached ? "scale-x-100" : "scale-x-0",
                )}
                style={{ transitionProperty: "scale, transform", transitionDuration: `${FILL_MS}ms` }}
              />
            </div>
            <div className="pt-6">
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-3 text-h3 font-semibold">{item.title}</h3>
              <p className="mt-2 max-w-sm text-muted-foreground">{item.desc}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
