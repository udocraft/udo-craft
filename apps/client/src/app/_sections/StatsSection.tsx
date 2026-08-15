"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useInView } from "framer-motion";
import { CountUp } from "@/app/_components/CountUp";

interface StatsSectionProps {
  stat1Value: number; stat1Suffix: string; stat1Label: string;
  stat2Value: number; stat2Suffix: string; stat2Label: string;
  stat3Value: number; stat3Suffix: string; stat3Label: string;
  stat4Value: number; stat4Suffix: string; stat4Label: string;
}

export function StatsSection(p: StatsSectionProps) {
  const t = useTranslations("stats");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const stats = [
    { value: p.stat1Value, suffix: p.stat1Suffix, label: p.stat1Label },
    { value: p.stat2Value, suffix: p.stat2Suffix, label: p.stat2Label },
    { value: p.stat3Value, suffix: p.stat3Suffix, label: p.stat3Label },
    { value: p.stat4Value, suffix: p.stat4Suffix, label: p.stat4Label },
  ];

  return (
    <section ref={ref} className="bg-background border-y border-border" aria-label={t("ariaLabel")}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="px-6 sm:px-10 py-10 border-r border-b md:border-b-0 border-border last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r text-center"
            >
              {/* foreground on background = 14:1 passes AAA */}
              <p className="text-4xl sm:text-5xl font-black text-foreground tabular-nums tracking-tight leading-none mb-2">
                <CountUp end={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs text-muted-foreground font-medium leading-snug">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
