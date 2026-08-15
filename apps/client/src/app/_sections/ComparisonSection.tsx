"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslations } from "next-intl";
import { Check, X, Minus } from "lucide-react";

const FEATURE_KEYS = [
  "minOrder", "editor", "samples", "manager", "fixedPrice",
  "timeline", "quality", "popup", "design", "logistics",
] as const;

type CellValue = "check" | "cross" | "partial" | string;

interface CellProps { value: CellValue; highlight: boolean; t: (key: string) => string }

function Cell({ value, highlight, t }: CellProps) {
  if (value === "check")
    return (
      <span className="inline-flex items-center justify-center" aria-label={t("yes")}>
        <Check className={`w-6 h-6 ${highlight ? "text-white" : "text-green-500"}`} strokeWidth={3} />
      </span>
    );
  if (value === "cross")
    return (
      <span className="inline-flex items-center justify-center" aria-label={t("no")}>
        <X className={`w-5 h-5 ${highlight ? "text-white/40" : "text-red-500/60"}`} strokeWidth={2.5} />
      </span>
    );
  if (value === "partial")
    return (
      <span className="inline-flex items-center justify-center" aria-label={t("partial")}>
        <Minus className={`w-5 h-5 ${highlight ? "text-white/80" : "text-amber-500"}`} strokeWidth={3} />
      </span>
    );
  return <span className={`text-sm font-bold ${highlight ? "text-white" : "text-foreground"}`}>{value}</span>;
}

const COLUMN_NAMES = ["typical", "udo", "printer"] as const;
const COLUMN_VALUES: CellValue[][] = [
  ["500+ шт", "cross", "cross", "cross", "cross", "30+ днів", "partial", "cross", "partial", "cross"],
  ["від 10 шт", "check", "check", "check", "check", "7–14 днів", "check", "check", "check", "check"],
  ["100+ шт", "cross", "partial", "cross", "partial", "14–21 днів", "partial", "cross", "partial", "cross"],
];

// ── Section ───────────────────────────────────────────────────────────────

export function ComparisonSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    startIndex: 1, // Start on U:DO Craft
    containScroll: "trimSnaps"
  });

  const [selectedIndex, setSelectedIndex] = useState(1);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi]);

  return (
    <section
      className="bg-muted py-24 sm:py-32"
      aria-labelledby="comparison-heading"
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-10 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <h2
            id="comparison-heading"
            className="text-3xl sm:text-4xl font-black tracking-tight mb-4"
          >
            U:DO проти решти ринку
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto leading-relaxed">
            Порівняй умови — і зрозумій, чому 500+ команд обирають нас.
          </p>
        </motion.div>

        {/* Mobile Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="block lg:hidden overflow-visible -mx-5 px-5 sm:-mx-10 sm:px-10" 
          ref={emblaRef}
        >
          <div className="flex gap-4" style={{ cursor: "grab" }}>
            {COLUMNS.map((col) => (
              <div key={col.name} className="flex-[0_0_85%] sm:flex-[0_0_60%] min-w-0">
                <div className={`rounded-3xl p-6 flex flex-col h-full border ${col.highlight ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-white border-black/[0.04] shadow-lg shadow-black/[0.03]'}`}>
                  <h3 className="font-black text-2xl text-center mb-6">{col.name}</h3>
                  <div className="flex flex-col gap-0">
                    {FEATURES.map((feature, fi) => (
                      <div key={feature.name} className={`flex justify-between items-center py-4 border-b ${col.highlight ? 'border-white/10' : 'border-border/60'} last:border-0`}>
                        <div className="flex flex-col pr-4">
                          <span className={`text-sm font-bold ${col.highlight ? 'text-white' : 'text-foreground'}`}>{feature.name}</span>
                          <span className={`text-[11px] leading-tight mt-1 ${col.highlight ? 'text-white/60' : 'text-muted-foreground'}`}>{feature.desc}</span>
                        </div>
                        <div className="shrink-0 flex items-center justify-end min-w-[70px]">
                          <Cell value={col.values[fi]} highlight={col.highlight} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mobile Pagination Dots */}
        <div className="flex lg:hidden justify-center gap-3 mt-8 mb-4" role="tablist" aria-label="Вибір постачальника">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              role="tab"
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Перейти до: ${COLUMNS[index].name}`}
              aria-selected={index === selectedIndex}
              className={`h-3 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                index === selectedIndex ? "bg-primary w-10" : "bg-black/15 hover:bg-black/25 w-3"
              }`}
            />
          ))}
        </div>

        {/* Desktop Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block overflow-x-auto bg-white rounded-[2rem] shadow-xl shadow-black/[0.03] border border-black/[0.04]"
        >
          <table
            className="w-full text-left"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
            role="table"
            aria-label="Порівняння постачальників мерчу"
          >
            <thead>
              <tr>
                <th
                  className="py-6 px-4 sm:px-8 text-sm font-semibold text-muted-foreground border-b border-border/60 w-1/3"
                  scope="col"
                >
                  Характеристика
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.name}
                    scope="col"
                    className={`py-6 px-4 sm:px-8 text-center align-bottom border-b border-border/60 w-[22%] ${
                      col.highlight
                        ? "bg-primary text-white"
                        : "text-foreground"
                    }`}
                  >
                    {col.highlight && (
                      <span className="block text-[10px] uppercase tracking-widest font-bold opacity-80 mb-2">
                        Ваш вибір
                      </span>
                    )}
                    <span className="block text-base font-black">{col.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, fi) => {
                const isLast = fi === FEATURES.length - 1;
                return (
                <tr
                  key={feature.name}
                  className="group transition-colors hover:bg-muted/30"
                >
                  <td className={`py-5 px-4 sm:px-8 ${isLast ? '' : 'border-b border-border/60'}`}>
                    <span className="block text-sm font-bold text-foreground">{feature.name}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{feature.desc}</span>
                  </td>
                  {COLUMNS.map((col) => (
                    <td
                      key={col.name}
                      className={`py-5 px-4 sm:px-8 text-center transition-colors ${
                        col.highlight ? "bg-primary text-white" : ""
                      } ${isLast && !col.highlight ? '' : 'border-b border-border/60'} ${isLast && col.highlight ? 'border-none' : ''}`}
                    >
                      <Cell value={col.values[fi]} highlight={col.highlight} />
                    </td>
                  ))}
                </tr>
              )})}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
