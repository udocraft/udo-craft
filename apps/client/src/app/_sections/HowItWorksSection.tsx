"use client";

import { Link } from "@/i18n/navigation";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

const STEP_KEYS = ["0", "1", "2"] as const;

export function HowItWorksSection() {
  const t = useTranslations("howItWorks");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = STEP_KEYS.map((key) => ({
    step: `0${Number(key) + 1}`,
    title: t(`steps.${key}.title`),
    desc: t(`steps.${key}.desc`),
    cta: t(`steps.${key}.cta`),
    href: key === "0" ? "#catalog" : key === "1" ? "/order" : "#contact",
  }));

  return (
    <section id="how" className="bg-[#050508] py-20 sm:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-16">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary block mb-3">{t("label")}</span>
          <h2 className="text-white text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            {t("heading")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-10 lg:gap-16">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start gap-4"
            >
              <div className="text-white/20 font-semibold text-3xl mb-1 tabular-nums">{item.step}.</div>
              <h3 className="text-white font-semibold text-2xl tracking-tight">{item.title}</h3>
              <p className="text-white/50 text-base leading-relaxed max-w-sm">{item.desc}</p>
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold hover:gap-2.5 transition-all duration-200 mt-2"
              >
                {item.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
