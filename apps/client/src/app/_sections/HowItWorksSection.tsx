"use client";

import { Link } from "@/i18n/navigation";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

const STEPS = [
  { step: "01", title: "Обери товари", desc: "Переглядай каталог, фільтруй за категоріями. Обирай базу для свого мерчу — худі, футболки, аксесуари.", cta: "До каталогу", href: "#catalog" },
  { step: "02", title: "Кастомуй одяг", desc: "Завантаж логотип, обери зону нанесення, розмір та колір. Переглянь попередній вигляд у реальному часі.", cta: "Спробувати", href: "/order" },
  { step: "03", title: "Отримай пропозицію", desc: "Заповни форму замовлення. Менеджер зв'яжеться з тобою для узгодження деталей та надішле рахунок.", cta: "Замовити", href: "#contact" },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how" className="bg-[#050508] py-20 sm:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-16">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary block mb-3">Як це працює</span>
          <h2 className="text-white text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Кастомуй під свої цілі
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-10 lg:gap-16">
          {STEPS.map((item, i) => (
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
