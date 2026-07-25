"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ArrowRight, Package, Palette, Zap } from "lucide-react";

const POPUP_STEPS = [
  { step: "01", title: "Обери пакет", desc: "Стікер-паки або пакети принтів — підбери під формат заходу", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80" },
  { step: "02", title: "Обери товар", desc: "Футболки, худі, аксесуари — гості обирають на місці", img: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80" },
  { step: "03", title: "Ми приїжджаємо", desc: "Привозимо обладнання та наносимо принти прямо на заході", img: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&q=80" },
];

function PopupCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [dragX, setDragX] = useState(0);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);
  const n = POPUP_STEPS.length;
  const goTo = useCallback((idx: number, dir: number) => { setDirection(dir); setActive(((idx % n) + n) % n); }, [n]);
  const next = useCallback(() => goTo(active + 1, 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1, -1), [active, goTo]);
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0 }),
  };
  return (
    <div className="flex flex-col gap-3 select-none">
      <div className="relative overflow-hidden rounded-xl aspect-[4/3]"
        onPointerDown={(e) => { dragStartX.current = e.clientX; isDragging.current = true; setDragX(0); }}
        onPointerMove={(e) => { if (!isDragging.current) return; setDragX(e.clientX - dragStartX.current); }}
        onPointerUp={() => {
          if (Math.abs(dragX) > 40) {
            if (dragX < 0) next();
            else prev();
          }
          setDragX(0);
          isDragging.current = false;
        }}
        onPointerLeave={() => { setDragX(0); isDragging.current = false; }}
        style={{ cursor: "grab" }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div key={active} custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }} style={{ x: dragX }} className="absolute inset-0">
            <Image src={POPUP_STEPS[active].img} alt={POPUP_STEPS[active].title} fill className="object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <p className="text-white font-bold text-sm mb-0.5">{POPUP_STEPS[active].title}</p>
              <p className="text-white/70 text-xs leading-relaxed">{POPUP_STEPS[active].desc}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {POPUP_STEPS.map((_, i) => (
            <button key={i} onClick={() => goTo(i, i > active ? 1 : -1)} aria-label={`Крок ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{ width: i === active ? 18 : 6, height: 6, backgroundColor: i === active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        <div className="flex gap-1.5">
          {[{ fn: prev, d: "M9 11L5 7l4-4", label: "Попередній" }, { fn: next, d: "M5 3l4 4-4 4", label: "Наступний" }].map(({ fn, d, label }) => (
            <button key={label} onClick={fn} aria-label={label}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ServicesSectionProps {
  heading: string;
  service1Title: string; service1Desc: string; service1Cta: string;
  service2Title: string; service2Desc: string; service2Cta: string;
}

export function ServicesSection({ service1Title, service1Desc, service1Cta, service2Title, service2Desc, service2Cta }: ServicesSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="bg-background py-20 sm:py-28" aria-labelledby="services-heading">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20">

        {/* Header — storytelling, not generic */}
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14"
        >
          <h2 id="services-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.0] mb-4">
            Три способи отримати<br />
            <span className="text-primary">ідеальний мерч</span>
          </h2>
          <p className="text-muted-foreground text-base max-w-lg leading-relaxed">
            Від фізичних зразків до виїзного стенду — обирай формат, який підходить саме тобі.
          </p>
        </motion.div>

        {/* Service cards — horizontal on desktop, stacked on mobile */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5">

          {/* Box of Touch */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-[#0a0d1a] rounded-2xl overflow-hidden flex flex-col group"
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(ellipse at 20% 20%, #3b82f6 0%, transparent 60%), radial-gradient(ellipse at 85% 85%, #6366f1 0%, transparent 55%)" }}
              aria-hidden="true" />
            <div className="relative z-10 flex flex-col flex-1 p-7">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-6">
                <Package className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="text-white text-xl font-black tracking-tight mb-3">{service1Title}</h3>
                {/* white/75 on #0a0d1a = 10:1+ passes AAA */}
                <p className="text-white/75 text-sm leading-relaxed">{service1Desc}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/8">
                <Link href="#contact?ref=box"
                  className="inline-flex items-center gap-2 bg-white text-gray-900 text-xs font-bold px-5 py-2.5 rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all duration-200">
                  {service1Cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Designer */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl overflow-hidden flex flex-col group"
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/designer-bg.jpg')" }} aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-black/45" aria-hidden="true" />
            <div className="relative z-10 flex flex-col flex-1 p-7">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mb-6">
                <Palette className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="text-white text-xl font-black tracking-tight mb-3">{service2Title}</h3>
                <p className="text-white/75 text-sm leading-relaxed">{service2Desc}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/8">
                <Link href="#contact?ref=designer"
                  className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-primary/90 active:scale-[0.97] transition-all duration-200">
                  {service2Cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[#0a0d1a] rounded-2xl overflow-hidden flex flex-col p-7"
          >
            <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center mb-6">
              <Zap className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <h3 className="text-white text-xl font-black tracking-tight mb-2">U:DO Popup</h3>
            <p className="text-white/75 text-sm leading-relaxed mb-5">
              Виїзний стенд з живою кастомізацією. Гості створюють унікальний мерч і забирають одразу.
            </p>
            <PopupCarousel />
            <div className="mt-5 pt-5 border-t border-white/8 flex items-center justify-between">
              <div className="flex gap-5">
                {[["500+", "заходів"], ["5 хв", "виріб"]].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-white text-base font-black">{v}</p>
                    <p className="text-white/50 text-[10px]">{l}</p>
                  </div>
                ))}
              </div>
              <Link href="/popup" className="text-white/60 hover:text-white text-xs font-semibold transition-colors duration-200 flex items-center gap-1">
                Детальніше <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Popup full-width CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#0a0d1a] rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-6">
            <div>
              <p className="text-white font-bold text-base">Виїзний Popup-стенд для вашого заходу</p>
              <p className="text-white/50 text-sm mt-0.5">500+ заходів · 50k+ гостей · 5 хв на виріб</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/popup"
              className="inline-flex items-center gap-2 bg-white text-[#0a0d1a] font-bold text-xs px-5 py-2.5 rounded-full hover:bg-white/90 active:scale-[0.97] transition-all duration-200">
              Дізнатись більше <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <Link href="#contact?ref=popup" className="text-white/50 hover:text-white/80 font-medium text-xs transition-colors duration-200 whitespace-nowrap">
              Обговорити →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
