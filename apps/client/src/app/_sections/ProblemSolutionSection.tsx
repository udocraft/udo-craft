"use client";

import { Link } from "@/i18n/navigation";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, X, Check } from "lucide-react";

const PROBLEMS = [
  "Мінімальний тираж 500+ одиниць",
  "Тижні на погодження макетів",
  "Якість не відповідає очікуванням",
  "Прихована вартість після замовлення",
];

const SOLUTIONS = [
  "Від 10 одиниць без доплат",
  "Онлайн-редактор — результат одразу",
  "Зразки перед тиражем (Box of Touch)",
  "Фіксована ціна в рахунку-фактурі",
];

export function ProblemSolutionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="bg-background overflow-hidden" aria-labelledby="problem-heading">
      <div className="grid lg:grid-cols-2">

        {/* Left */}
        <motion.div ref={ref}
          initial={{ opacity: 0, x: -24 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center px-8 sm:px-12 lg:pl-[max(3rem,calc((100vw-72rem)/2+3rem))] lg:pr-16 py-16 lg:py-28"
        >
            <h2 id="problem-heading" className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.05] mb-8">
              Ринок перенасичений дешевим мерчем, який ніхто не носить
            </h2>
            <ul className="space-y-3" aria-label="Типові проблеми">
              {PROBLEMS.map((p, i) => (
                <motion.li key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0" aria-hidden="true">
                    <X className="w-3 h-3 text-red-500" />
                  </span>
                  {p}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#0a0d1a] px-8 sm:px-12 lg:pr-[max(3rem,calc((100vw-72rem)/2+3rem))] lg:pl-16 py-16 lg:py-28 flex flex-col justify-center"
          >
            <h3 className="text-white text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-8">
              Мерч, який стає частиною бренду
            </h3>
            <ul className="space-y-3 mb-10" aria-label="Переваги U:DO">
              {SOLUTIONS.map((s, i) => (
                <motion.li key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 text-sm text-white/90"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-500/25 border border-blue-400/50 flex items-center justify-center shrink-0" aria-hidden="true">
                    <Check className="w-3 h-3 text-blue-300" />
                  </span>
                  {s}
                </motion.li>
              ))}
            </ul>
            <Link href="#catalog"
              className="inline-flex w-fit items-center gap-2 bg-primary text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-primary/90 active:scale-[0.97] transition-all duration-200">
              Переглянути каталог <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </motion.div>
      </div>
    </section>
  );
}
