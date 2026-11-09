"use client";

import { Link } from "@/i18n/navigation";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { HighlightText, RoughHighlight } from "@/app/_components/HighlightText";
import { Button } from "@udo-craft/ui";

export function FinalCtaSection() {
  const t = useTranslations("finalCta");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      className="bg-primary py-24 sm:py-32 overflow-hidden relative"
      aria-labelledby="final-cta-heading"
    >
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20 relative text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-white/50 text-xs font-bold uppercase tracking-[0.22em] mb-6">
            {t("ready")}
          </p>
          <h2
            id="final-cta-heading"
            className="text-white font-black tracking-tight leading-[0.95] mb-8"
            style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
          >
            {t("heading")}
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-md mx-auto mb-10">
            {t("desc")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild variant="inverse" size="lg" className="shadow-xl shadow-black/20 bg-white text-primary hover:bg-white/90">
              <Link href="/order">
                {t("cta")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <p className="text-white/30 text-xs mt-8">
            {t("footer")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
