"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Check, PackageCheck, RefreshCw, Route, Shirt, Truck } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    title: "Onboarding Box",
    desc: "Ідеально для IT та корпоративного сектору. Новий співробітник — ми автоматично відправляємо йому welcome-пак.",
    features: ["Персоналізація імені", "Пряма доставка додому", "Зберігання на нашому складі"],
    accent: "bg-[#f2c94c]",
    icon: PackageCheck,
  },
  {
    title: "HoReCa & Retail",
    desc: "Щомісячне оновлення уніформи для команд. Чисті, нові футболки та фартухи без необхідності тримати запас.",
    features: ["Заміна зношеного мерчу", "Гнучке управління розмірами", "Швидка доставка на точки"],
    accent: "bg-[#eb5757]",
    icon: Shirt,
  },
];

const FLOW = [
  { label: "Stock", icon: PackageCheck, tone: "bg-[#f2c94c]" },
  { label: "Pack", icon: Shirt, tone: "bg-white" },
  { label: "Ship", icon: Truck, tone: "bg-[#2f80ed] text-white" },
];

export function SubscriptionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative overflow-hidden bg-[#f5f5f2] py-24 sm:py-32" aria-labelledby="subscription-heading">
      <div className="absolute inset-x-0 top-0 h-px bg-black/10" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/10" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-20">
        <div className="grid gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20 lg:items-center">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-8 inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm">
              <RefreshCw className="size-4 text-[#2f80ed]" />
              Always in stock
            </div>

            <h2 id="subscription-heading" className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl">
              Мерч за підпискою.
              <span className="block text-foreground/45">Система замість коробок.</span>
            </h2>

            <p className="mt-6 max-w-xl text-base leading-7 text-foreground/65 sm:text-lg">
              Забудьте про коробки в офісі та ручну відправку поштою. Зберігаємо, пакуємо та відправляємо ваш мерч тоді, коли це потрібно.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="#contact" className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98]">
              Обговорити підписку <ArrowRight className="w-5 h-5" />
            </Link>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/55">
                <Route className="size-4" />
                Склад → комплектація → доставка
              </div>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 border-y border-black/10">
              {[
                ["0", "офісних коробок"],
                ["24г", "на запуск відправки"],
                ["∞", "повторних циклів"],
              ].map(([value, label]) => (
                <div key={label} className="border-r border-black/10 py-5 pr-4 last:border-r-0">
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-foreground/45">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative min-h-[620px] overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
              <div className="absolute right-0 top-0 h-28 w-28 bg-[#eb5757]" aria-hidden="true" />
              <div className="absolute right-28 top-0 h-28 w-28 rounded-full bg-[#f2c94c]" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 h-36 w-36 bg-[#2f80ed]" aria-hidden="true" />

              <div className="relative grid h-full min-h-[620px] grid-rows-[auto_1fr_auto]">
                <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">U:DO subscription OS</p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">Merch flow</p>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-full border border-black/10 bg-[#f5f5f2]">
                    <RefreshCw className="size-5 text-foreground" />
                  </div>
                </div>

                <div className="grid content-center gap-8 px-6 py-10">
                  <div className="grid grid-cols-3 gap-3">
                    {FLOW.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="relative">
                          {index < FLOW.length - 1 && (
                            <div className="absolute left-[calc(100%-4px)] top-9 h-px w-4 bg-black/20" aria-hidden="true" />
                          )}
                          <div className={`flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-black/10 ${item.tone}`}>
                            <Icon className="size-7" />
                            <span className="text-xs font-semibold uppercase tracking-[0.16em]">{item.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-3">
                    {PLANS.map((plan) => {
                      const Icon = plan.icon;
                      return (
                        <article key={plan.title} className="rounded-lg border border-black/10 bg-[#fbfbf8] p-5 transition-colors hover:bg-white">
                          <div className="flex items-start gap-4">
                            <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${plan.accent}`}>
                              <Icon className="size-5 text-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-semibold tracking-tight text-foreground">{plan.title}</h3>
                              <p className="mt-2 text-sm leading-6 text-foreground/58">{plan.desc}</p>
                              <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                                {plan.features.map((feature) => (
                                  <li key={feature} className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
                                    <Check className="size-4 shrink-0 text-[#2f80ed]" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-end border-t border-black/10">
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">Next dispatch</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Friday · 14:00</p>
                  </div>
                  <div className="h-full w-28 bg-foreground" aria-hidden="true" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
