"use client";

import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRef } from "react";

const BRANDS = [
  "Kyivstar", "Genesis", "Monobank", "Rozetka", "Nova Poshta",
  "Uklon", "Grammarly", "Ajax Systems", "MacPaw", "Intellias",
  "Reface", "Preply", "Jooble", "Depositphotos", "Ciklum",
];

export function SocialProofBar() {
  const t = useTranslations("socialProof");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="bg-background border-b border-border py-10 overflow-hidden" aria-label="Клієнти">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20 mb-7">
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground text-center"
        >
          {t("trustedBy")}
        </motion.p>
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" aria-hidden="true" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" aria-hidden="true" />

        <motion.div
          className="flex gap-14 items-center whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          aria-hidden="true"
        >
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <span key={i} className="text-muted-foreground/40 font-black text-sm tracking-tight uppercase select-none">
              {brand}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
