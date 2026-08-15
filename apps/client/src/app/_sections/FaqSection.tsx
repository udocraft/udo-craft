"use client";

import { Link } from "@/i18n/navigation";
import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Plus, Minus } from "lucide-react";
import { useCms } from "@/hooks/useCms";

const FAQ_KEYS = ["0", "1", "2", "3", "4", "5"] as const;

function FaqItem({ q, a, index, isInView }: { q: string; a: string; index: number; isInView: boolean }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${index}`;
  const panelId = `faq-panel-${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-border last:border-b-0"
    >
      <button
        id={id}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
      >
        <span className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
          {q}
        </span>
        <span
          className="w-7 h-7 rounded-full border border-border flex items-center justify-center shrink-0 text-muted-foreground group-hover:border-primary group-hover:text-primary transition-all duration-200"
          aria-hidden="true"
        >
          {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground leading-relaxed pb-5 max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FaqSection() {
  const t = useTranslations("faq");
  const { cms } = useCms();
  const data = cms.home_faq || {};

  const heading = (data.heading as string) || t("heading");
  const items = (data.items as unknown as any[]) || FAQ_KEYS.map((key) => ({
    question: t(`items.${key}.question`),
    answer: t(`items.${key}.answer`),
  }));

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="faq"
      className="bg-background py-20 sm:py-28"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16 lg:gap-24">

          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-24 self-start"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-4">FAQ</p>
            <h2 id="faq-heading" className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-4">
              {heading}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("noAnswer")} <Link href="#contact" className="text-primary font-medium hover:underline hover:text-primary/80 transition-colors">{t("contactUs")}</Link>{t("replyTime")}
            </p>
          </motion.div>

          <div role="list" aria-label={t("questionsLabel")}>
            {items.map((faq, i) => (
              <FaqItem key={i} q={faq.question || faq.q} a={faq.answer || faq.a} index={i} isInView={isInView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
