"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HighlightText, RoughHighlight } from "@/app/_components/HighlightText";

const SLIDES = [
  {
    title: "Обери пакет",
    desc: "Стікер-паки або пакети принтів — підбери під формат заходу",
    img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=75",
  },
  {
    title: "Обери товар",
    desc: "Футболки, худі, аксесуари — гості обирають на місці",
    img: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=900&q=75",
  },
  {
    title: "Ми приїжджаємо",
    desc: "Привозимо обладнання та наносимо принти прямо на заході",
    img: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=900&q=75",
  },
];

export function PopupStandSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);
  const [dragX, setDragX] = useState(0);
  const n = SLIDES.length;

  const goTo = useCallback((idx: number, dir: number) => {
    setDirection(dir);
    setActive(((idx % n) + n) % n);
  }, [n]);
  const next = useCallback(() => goTo(active + 1, 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1, -1), [active, goTo]);

  useEffect(() => {
    if (isDragging.current) return;
    const interval = setInterval(() => {
      next();
    }, 4000);
    return () => clearInterval(interval);
  }, [active, next]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-30%" : "30%", opacity: 0 }),
  };

  return (
    <section className="bg-background overflow-hidden" aria-labelledby="popup-heading">
      <div className="grid lg:grid-cols-2 items-stretch">

        {/* Left */}
        <div className="flex flex-col justify-center px-8 sm:px-12 lg:pr-[max(3rem,calc((100vw-72rem)/2+3rem))] lg:pl-16 py-16 lg:py-28 order-last lg:order-last">

          {/* Header */}
          <motion.div ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em] mb-5">U:DO Popup</p>
            <h2 id="popup-heading" className="text-foreground text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.0] max-w-2xl">
              Виїзний стенд — мерч прямо на заході
            </h2>
          </motion.div>

          {/* Items */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-0"
          >
            {SLIDES.map((slide, i) => (
              <button
                key={slide.title}
                onClick={() => goTo(i, i > active ? 1 : -1)}
                className={`text-left p-6 transition-colors duration-300 rounded-2xl group relative overflow-hidden mb-2 last:mb-0 ${
                  i === active ? "bg-muted" : "hover:bg-muted/50"
                }`}
                aria-pressed={i === active}
              >
                <motion.div
                  animate={{ opacity: i === active ? 1 : 0.5 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="font-bold text-lg mb-1.5 leading-tight text-foreground">
                    {slide.title}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {slide.desc}
                  </p>
                </motion.div>
              </button>
            ))}

            {/* CTA */}
            <div className="flex items-center gap-4 mt-6 px-4">
              <Link href="/popup"
                className="inline-flex items-center gap-2 bg-primary text-white font-bold text-sm px-6 py-3 rounded-full hover:bg-primary/90 active:scale-[0.97] transition-all duration-200">
                Дізнатись більше <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right — image only, no extra elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative min-h-[400px] lg:min-h-full order-first lg:order-first"
        >
          <div
            className="absolute inset-0 select-none overflow-hidden"
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
              style={{ cursor: "grab" }}
              role="region"
              aria-label="Фотографії Popup-стенду"
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div key={active} custom={direction} variants={variants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  style={{ x: dragX }}
                  className="absolute inset-0"
                >
                  <Image
                    src={SLIDES[active].img}
                    alt={SLIDES[active].title}
                    fill
                    className="object-cover"
                    draggable={false}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Minimal dot indicators only */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
                {SLIDES.map((_, i) => (
                  <button key={i} onClick={() => goTo(i, i > active ? 1 : -1)} aria-label={`Слайд ${i + 1}`}
                    className={`rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 h-3`}
                    style={{
                      width: i === active ? 40 : 12,
                      backgroundColor: i === active ? "var(--color-primary)" : "rgba(0,0,0,0.25)",
                      backdropFilter: i === active ? "none" : "blur(4px)",
                      border: i === active ? "none" : "1px solid rgba(255,255,255,0.5)"
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
      </div>
    </section>
  );
}
