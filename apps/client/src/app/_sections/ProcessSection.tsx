"use client";

import { Link } from "@/i18n/navigation";
import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, Check } from "lucide-react";
import { HighlightText, RoughHighlight } from "@/app/_components/HighlightText";

const STEPS = [
  {
    number: "1",
    emoji: "🛒",
    title: "Обери товар",
    body: "Переглядай каталог з реальними цінами. Ціна оновлюється одразу при зміні кількості та типу нанесення. Жодних дзвінків, щоб дізнатись вартість.",
    cta: "Відкрити каталог",
    href: "#catalog",
    time: "~5 хв",
  },
  {
    number: "2",
    emoji: "🎨",
    title: "Кастомуй онлайн",
    body: "Завантаж логотип, постав на виріб, обери зону нанесення. Редактор показує точну вартість кожної зони в реальному часі.",
    cta: "Спробувати редактор",
    href: "/order",
    time: "~10 хв",
  },
  {
    number: "3",
    emoji: "📝",
    title: "Отримай рахунок",
    body: "Заповни форму — менеджер зв'яжеться протягом 2 годин. Фіксована ціна без прихованих доплат. Рахунок-фактура одразу після підтвердження.",
    cta: "Написати нам",
    href: "#contact",
    time: "~2 год",
  },
  {
    number: "4",
    emoji: "📦",
    title: "Отримай мерч",
    body: "Виробництво 7–14 робочих днів. Доставка Новою Поштою по всій Україні. Якщо щось не так — переробляємо безкоштовно.",
    cta: "Читати FAQ",
    href: "#faq",
    time: "7–14 днів",
  },
];

// The progress line animates from 0% to the target width over STEP_DURATION ms
const STEP_DURATION = 7500; // ms per step

function DesktopTimeline({ isInView }: { isInView: boolean }) {
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  // progressPct: 0–100, represents how far the line has filled
  // Each step occupies 1/(n-1) of the total width
  const [progressPct, setProgressPct] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const n = STEPS.length;

  useEffect(() => {
    if (isInView && !started) {
      setStarted(true);
      setActive(0);
      setProgressPct(0);
    }
  }, [isInView, started]);

  // Animate progress from current step to next
  useEffect(() => {
    if (!started) return;
    if (active >= n - 1) return; // already at last step

    const targetPct = (active + 1) / (n - 1) * 100;
    const startPct = active / (n - 1) * 100;
    startTimeRef.current = null;

    const animate = (ts: number) => {
      if (startTimeRef.current === null) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const t = Math.min(elapsed / STEP_DURATION, 1);
      // ease in-out
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setProgressPct(startPct + (targetPct - startPct) * eased);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setProgressPct(targetPct);
        setActive((s) => s + 1);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, started, n]);

  const handleStepClick = (i: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setActive(i);
    setProgressPct(i / (n - 1) * 100);
  };

  return (
    <div className="hidden lg:block">
      <style>{`
        @keyframes progress-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
      {/* Track + nodes */}
      <div className="relative mb-14" role="tablist" aria-label="Кроки процесу">
        {/* Background track */}
        <div className="absolute top-[14px] left-5 right-5 h-3 bg-border/50 rounded-full overflow-hidden" aria-hidden="true">
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            style={{
              width: `${progressPct}%`,
              transition: "none",
              backgroundImage: "linear-gradient(-45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.2) 75%, transparent 75%, transparent)",
              backgroundSize: "1rem 1rem",
              animation: "progress-stripes 1s linear infinite"
            }}
          />
        </div>

        {/* Step nodes */}
        <div className="relative flex justify-between">
          {STEPS.map((step, i) => {
            const isPast = i < active;
            const isCurrent = i === active;
            const isFuture = i > active;
            return (
              <button key={step.number} role="tab"
                aria-selected={isCurrent}
                aria-label={`Крок ${step.number}: ${step.title}`}
                onClick={() => handleStepClick(i)}
                className="flex flex-col items-center gap-3 group"
              >
                <motion.div
                  animate={{
                    backgroundColor: isPast || isCurrent ? "var(--color-primary)" : "var(--color-background)",
                    borderColor: isPast || isCurrent ? "var(--color-primary)" : "var(--color-border)",
                    scale: isCurrent ? 1.15 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center relative z-10 transition-shadow bg-background ${isCurrent ? 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' : ''}`}
                >
                  <motion.span
                    animate={{ color: isPast || isCurrent ? "white" : "var(--color-muted-foreground)" }}
                    className="text-sm font-black tabular-nums"
                  >
                    {step.number}
                  </motion.span>
                  {isPast && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center border-[1.5px] border-background z-20"
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={4} />
                    </motion.div>
                  )}
                </motion.div>
                <motion.span
                  animate={{
                    color: isCurrent ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                    fontWeight: isCurrent ? 700 : 500,
                  }}
                  className="text-xs text-center max-w-[80px] leading-tight"
                >
                  {step.title}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active step detail */}
      <div style={{ minHeight: 220 }} className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-[2rem] shadow-xl shadow-black/[0.03] border border-black/[0.04] p-8 sm:p-12 flex flex-col"
            role="tabpanel"
          >
            <div className="flex-1 mb-8">
              <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-4">{STEPS[active].title}</h3>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl">{STEPS[active].body}</p>
            </div>
            
            <div className="w-full h-px bg-border/50 mb-6" aria-hidden="true" />
            
            <div className="flex flex-col sm:flex-row-reverse sm:items-center justify-between gap-6">
              <div className="text-left sm:text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1.5">Орієнтовний час</p>
                <p className="text-xl font-black text-foreground">{STEPS[active].time}</p>
              </div>
              <Link href={STEPS[active].href}
                className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-8 py-4 rounded-full hover:bg-primary/90 hover:scale-105 active:scale-[0.97] transition-all duration-200 whitespace-nowrap w-full sm:w-auto shadow-md shadow-primary/20">
                {STEPS[active].cta} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function MobileTimeline() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [active, setActive] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps"
  });

  const n = STEPS.length;
  const progressPct = (active / (n - 1)) * 100;

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setActive(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi]);

  const handleStepClick = (i: number) => {
    if (emblaApi) emblaApi.scrollTo(i);
  };

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, type: "spring", stiffness: 300, damping: 25 }}
      className="lg:hidden"
    >
      <style>{`
        @keyframes progress-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
      
      {/* Mobile Track + nodes */}
      <div className="relative mb-10" role="tablist">
        {/* Background track */}
        <div className="absolute top-[14px] left-5 right-5 h-3 bg-border/50 rounded-full overflow-hidden" aria-hidden="true">
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progressPct}%`,
              backgroundImage: "linear-gradient(-45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.2) 75%, transparent 75%, transparent)",
              backgroundSize: "1rem 1rem",
              animation: "progress-stripes 1s linear infinite"
            }}
          />
        </div>

        {/* Step nodes */}
        <div className="relative flex justify-between">
          {STEPS.map((step, i) => {
            const isPast = i < active;
            const isCurrent = i === active;
            return (
              <button key={step.number} role="tab"
                aria-selected={isCurrent}
                aria-label={`Крок ${step.number}: ${step.title}`}
                onClick={() => handleStepClick(i)}
                className="flex flex-col items-center gap-3 group"
              >
                <motion.div
                  animate={{
                    backgroundColor: isPast || isCurrent ? "var(--color-primary)" : "var(--color-background)",
                    borderColor: isPast || isCurrent ? "var(--color-primary)" : "var(--color-border)",
                    scale: isCurrent ? 1.15 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center relative z-10 transition-shadow bg-background ${isCurrent ? 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' : ''}`}
                >
                  <motion.span
                    animate={{ color: isPast || isCurrent ? "white" : "var(--color-muted-foreground)" }}
                    className="text-sm font-black tabular-nums"
                  >
                    {step.number}
                  </motion.span>
                  {isPast && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center border-[1.5px] border-background z-20"
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={4} />
                    </motion.div>
                  )}
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-visible -mx-5 px-5 sm:-mx-10 sm:px-10" ref={emblaRef}>
        <div className="flex gap-4" style={{ cursor: "grab" }} onMouseDown={(e) => (e.currentTarget.style.cursor = "grabbing")} onMouseUp={(e) => (e.currentTarget.style.cursor = "grab")} onMouseLeave={(e) => (e.currentTarget.style.cursor = "grab")}>
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex-[0_0_90%] sm:flex-[0_0_75%] min-w-0">
              <div className="bg-white rounded-3xl shadow-lg shadow-black/[0.03] border border-black/[0.04] p-7 flex flex-col h-full">
                <div className="mb-4 flex-1">
                   <h3 className="font-bold text-foreground text-xl leading-tight mb-2">{step.title}</h3>
                   <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
                </div>
                
                <div className="w-full h-px bg-border/50 mb-5" aria-hidden="true" />
                
                <div className="flex flex-col gap-4 text-left">
                   <div>
                     <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Орієнтовний час</p>
                     <p className="text-lg font-black text-foreground">{step.time}</p>
                   </div>
                   <Link href={step.href}
                     className="flex items-center justify-center gap-2 w-full bg-primary text-white hover:bg-primary/90 font-semibold text-sm px-6 py-3.5 rounded-full transition-all duration-200 shadow-md shadow-primary/20">
                     {step.cta} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                   </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function ProcessSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how" className="bg-muted py-24 sm:py-32" aria-labelledby="process-heading">
      <div className="max-w-4xl mx-auto px-5 sm:px-10 lg:px-8">
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <h2 id="process-heading" className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Від ідеї до мерчу — за 4 кроки
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
            Весь процес займає менше 15 хвилин вашого часу. Ціни видно одразу — без дзвінків і переговорів.
          </p>
        </motion.div>

        <DesktopTimeline isInView={isInView} />
        <MobileTimeline />
      </div>
    </section>
  );
}
