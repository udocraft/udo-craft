"use client";

import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";

export function SubscriptionSection() {
  const t = useTranslations("subscription");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const PLANS = [
    {
      title: t("plans.welcome.title"),
      desc: t("plans.welcome.desc"),
      features: [
        t("plans.welcome.features.0"),
        t("plans.welcome.features.1"),
        t("plans.welcome.features.2"),
      ],
    },
    {
      title: t("plans.uniform.title"),
      desc: t("plans.uniform.desc"),
      features: [
        t("plans.uniform.features.0"),
        t("plans.uniform.features.1"),
        t("plans.uniform.features.2"),
      ],
    },
  ];

  const STEPS = [
    t("steps.warehouse"),
    t("steps.packing"),
    t("steps.shipping"),
  ];

  return (
    <section className="relative overflow-hidden border-y border-border bg-white py-24 sm:py-32" aria-labelledby="subscription-heading">
      <div className="mx-auto max-w-6xl px-5 sm:px-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("label")}
          </p>
          <h2 id="subscription-heading" className="mt-5 text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-6xl">
            {t("heading")}
            <span className="block text-foreground/45">{t("headingMuted")}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {t("desc")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-14 max-w-5xl rounded-[28px] border border-border bg-[#f7f7f7] p-2 shadow-[0_30px_90px_rgba(15,23,42,0.08)]"
        >
          <div className="rounded-[22px] bg-white p-5 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step} className="rounded-2xl border border-border bg-background p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums text-foreground">{String(index + 1).padStart(2, "0")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {PLANS.map((plan) => (
                <article key={plan.title} className="rounded-2xl border border-border bg-white p-5">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{plan.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.desc}</p>
                  <div className="mt-5 grid gap-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-foreground/75">
                        <Check className="size-4 text-foreground" strokeWidth={1.8} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="#contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98]"
              >
                {t("cta")}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
