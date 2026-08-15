"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { HighlightText } from "@/app/_components/HighlightText";

export function AboutSection() {
  const t = useTranslations("about");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const features = ["editor", "minOrder", "pricing", "timeline", "quality", "manager"] as const;

  return (
    <section id="about" className="bg-background py-24 sm:py-32" aria-labelledby="about-heading">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20">

        <motion.div ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em] mb-6">
            {t("label")}
          </p>
          <h2 id="about-heading" className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95] mb-8 max-w-3xl">
            {t("heading")}{" "}
            <HighlightText delay={0.5}>{t("headingHighlight")}</HighlightText>
          </h2>
          <div className="grid lg:grid-cols-2 gap-6 max-w-3xl">
            <p className="text-muted-foreground text-base leading-relaxed">
              {t("desc1")}
            </p>
            <p className="text-muted-foreground text-base leading-relaxed">
              {t("desc2")}
            </p>
          </div>
        </motion.div>

        <div className="border-t border-border mb-16" aria-hidden="true" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
          {features.map((key, i) => (
            <motion.div key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <h3 className="font-bold text-foreground text-base mb-2">
                {t(`features.${key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`features.${key}.desc`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
