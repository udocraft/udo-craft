"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { HighlightText, RoughHighlight } from "@/app/_components/HighlightText";
import { useCms } from "@/hooks/useCms";
import { useTranslations } from "next-intl";

export function TrustSection() {
  const t = useTranslations("trust");
  const { cms } = useCms();
  const data = cms.home_trust || {};
  
  const heading = (data.heading as string) || t("heading");
  const subtext = (data.subtext as string) || t("subtext");
  
  const guarantees = (data.guarantees as unknown as any[]) || [
    {
      title: t("guarantees.0.title"),
      body: t("guarantees.0.body"),
    },
    {
      title: t("guarantees.1.title"),
      body: t("guarantees.1.body"),
    },
    {
      title: t("guarantees.2.title"),
      body: t("guarantees.2.body"),
    },
    {
      title: t("guarantees.3.title"),
      body: t("guarantees.3.body"),
    },
  ];

  const numbers = (data.numbers as unknown as any[]) || [
    { value: t("numbers.0.value"), label: t("numbers.0.label") },
    { value: t("numbers.1.value"), label: t("numbers.1.label") },
    { value: t("numbers.2.value"), label: t("numbers.2.label") },
    { value: t("numbers.3.value"), label: t("numbers.3.label") },
  ];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="bg-[#0a0d1a] py-24 sm:py-32" aria-labelledby="trust-heading">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20">

        <motion.div ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <h2 id="trust-heading" className="text-white text-3xl sm:text-4xl font-black tracking-tight mb-4">
            {heading}
          </h2>
          <p className="text-white/55 text-base max-w-lg leading-relaxed">
            {subtext}
          </p>
        </motion.div>

        {/* Guarantees — two column, no cards, just text */}
        <div className="grid sm:grid-cols-2 gap-x-16 gap-y-10 mb-16">
          {guarantees.map((g, i) => (
            <motion.div key={(g.title || "") + i}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
              className="border-t border-white/10 pt-6"
            >
              <h3 className="text-white font-bold text-base mb-2">{g.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{g.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Numbers — large, editorial */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-10 border-t border-white/10"
          aria-label="Ключові показники"
        >
          {numbers.map((n, i) => (
            <div key={(n.label || "") + i}>
              <p className="text-white text-3xl font-black tracking-tight mb-1">{n.value}</p>
              <p className="text-white/40 text-xs leading-snug">{n.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
