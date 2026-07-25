"use client";

import { Link } from "@/i18n/navigation";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HighlightText, RoughHighlight } from "@/app/_components/HighlightText";

const STEPS = [
  {
    emoji: "💬",
    title: "Розкажи про бренд",
    body: "Надішли логотип, фірмові кольори та опис стилю. Якщо нічого немає — просто розкажи про компанію. Брифінг займає 10–15 хвилин онлайн або по телефону.",
  },
  {
    emoji: "✨",
    title: "Отримай концепцію",
    body: "Дизайнер підготує 2–3 варіанти адаптації для нанесення на одяг. Термін — 2 робочі дні. Включає адаптацію під шовкодрук, вишивку та DTF.",
  },
  {
    emoji: "✅",
    title: "Затверди і замовляй",
    body: "Обери варіант, внеси правки (до 2 раундів включено), отримай фінальні файли. Всі файли залишаються у тебе — для будь-яких майбутніх замовлень.",
  },
];

export function DesignerSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      className="bg-background py-24 sm:py-32 border-t border-border"
      aria-labelledby="designer-heading"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20">

        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-end mb-16"
        >
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em] mb-5">
              Дизайн-сервіс
            </p>
            <h2
              id="designer-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.02]"
            >
              Немає логотипу? Ми допоможемо
            </h2>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">
            Наш дизайнер адаптує ваш логотип під нанесення або створить фірмовий стиль з нуля. Результат — за 2 дні.
          </p>
        </motion.div>

        {/* 3 steps — icon + title + prose, no cards, no dividers */}
        <div className="grid md:grid-cols-3 gap-10 md:gap-12 mb-14">
          {STEPS.map(({ emoji, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4"
            >
              {/* Emoji illustration */}
              <div className="text-3xl" aria-hidden="true">{emoji}</div>
              <div>
                <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-start mt-4"
        >
          <Link
            href="#contact?ref=designer"
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-8 py-4 rounded-full hover:bg-primary/90 hover:scale-105 active:scale-[0.97] shadow-md shadow-primary/20 transition-all duration-200 shrink-0"
          >
            Обговорити проєкт <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
