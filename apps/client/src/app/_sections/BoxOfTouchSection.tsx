"use client";

import { useRef, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { HighlightText } from "@/app/_components/HighlightText";

const CONTENT_KEYS = ["products", "fabrics", "palette", "printing"] as const;

export function BoxOfTouchSection() {
  const t = useTranslations("boxOfTouch");
  const ref = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(ref, { once: false, margin: "200px" });
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isInView && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isInView, shouldLoad]);

  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  return (
    <section
      ref={ref}
      className="border-t border-border overflow-hidden"
      style={{ backgroundColor: "#0a0d1a" }}
      aria-labelledby="box-heading"
    >
      <div className="grid lg:grid-cols-2 min-h-[520px]">

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center px-8 sm:px-12 lg:pl-[max(3rem,calc((100vw-72rem)/2+3rem))] lg:pr-12 py-16 lg:py-20"
        >
            <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em] mb-6">
              {t("label")}
            </p>
            <h2
              id="box-heading"
              className="text-white text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.02] mb-6"
            >
              {t("heading")}{" "}
              <HighlightText delay={0.5} color="rgba(255,255,255,0.15)">{t("headingHighlight")}</HighlightText>
            </h2>

            <p className="text-white/65 text-base leading-relaxed mb-8 max-w-md">
              {t("desc")}
            </p>

            <ul className="space-y-3 mb-10" aria-label={t("contentsLabel")}>
              {CONTENT_KEYS.map((key, i) => (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-3"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="text-white text-sm font-semibold">{t(`contents.${key}.label`)}</span>
                    <span className="text-white/55 text-sm"> — {t(`contents.${key}.desc`)}</span>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="flex items-center gap-4">
              <Link
                href="#contact?ref=box"
                className="inline-flex items-center gap-2.5 bg-primary text-white font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-primary/90 active:scale-[0.97] transition-all duration-200 shadow-md shadow-primary/20"
              >
                {t("cta")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="text-white/45 text-xs mt-3">{t("freeDelivery")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-h-[360px] lg:min-h-0 overflow-hidden bg-white/5"
          >
            {shouldLoad ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                src="/bot-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
              />
            ) : (
              <div className="absolute inset-0 bg-white/5 animate-pulse" />
            )}
          </motion.div>
        </div>
    </section>
  );
}

