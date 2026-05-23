"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Check,
  Layers,
  Minus,
  MousePointer2,
  Palette,
  Pencil,
  Plus,
  Shapes,
  Shirt,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";

const TOOLS = [
  { label: "Принти", icon: Layers, active: true },
  { label: "Фігури", icon: Shapes },
  { label: "Малюнок", icon: Pencil },
  { label: "Текст", icon: Type },
  { label: "Файл", icon: Upload },
];

const LAYERS = [
  { name: "UDO mark", meta: "DTF · 120 мм", color: "bg-primary" },
  { name: "Back label", meta: "Вишивка · 48 мм", color: "bg-[#f2c94c]" },
  { name: "Sleeve icon", meta: "Шовкодрук · 32 мм", color: "bg-[#eb5757]" },
];

export function CustomizerPreviewSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative overflow-hidden bg-background py-24 sm:py-32 border-t border-border" aria-labelledby="customizer-preview-heading">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-20">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"
        >
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Онлайн-конструктор
            </p>
            <h2 id="customizer-preview-heading" className="max-w-2xl text-3xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl">
              Зберіть мерч прямо в інтерфейсі
            </h2>
          </div>
          <div className="max-w-xl lg:ml-auto">
            <p className="text-base leading-relaxed text-muted-foreground">
              Обирайте виріб, додавайте логотипи, керуйте шарами й одразу бачте тиражну ціну. Це той самий робочий простір, з якого команда переходить до замовлення.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_80px_rgba(15,23,42,0.10)]"
        >
          <div className="flex h-12 items-center justify-between border-b border-border bg-muted/35 px-4">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#eb5757]" />
              <span className="size-3 rounded-full bg-[#f2c94c]" />
              <span className="size-3 rounded-full bg-primary" />
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:flex">
              <MousePointer2 className="size-3.5" />
              Hoodie Classic · Front
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              U:DO Studio
            </div>
          </div>

          <div className="grid min-h-[680px] lg:grid-cols-[64px_260px_1fr_300px]">
            <aside className="hidden border-r border-border bg-card lg:flex lg:flex-col lg:items-center lg:gap-1 lg:p-2">
              {TOOLS.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  className={`relative flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />}
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </aside>

            <aside className="hidden border-r border-border bg-card p-4 lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Принти</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {["U:DO", "TEAM", "DROP", "2026"].map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    className={`aspect-square rounded-lg border p-3 text-left transition-colors ${
                      index === 0 ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <span className="block text-lg font-black tracking-tight">{item}</span>
                    <span className="mt-6 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">print</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Колір виробу</p>
                  <Palette className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-3 flex gap-2">
                  {["bg-black", "bg-[#f5f5f2]", "bg-[#2f80ed]", "bg-[#eb5757]"].map((color) => (
                    <span key={color} className={`size-7 rounded-full border border-border ${color}`} />
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="size-4" />
                  AI preview
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Побачте, як дизайн виглядає на людині перед замовленням.
                </p>
              </div>
            </aside>

            <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden bg-muted/40 p-5 sm:p-8">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:48px_48px]" aria-hidden="true" />
              <div className="relative w-full max-w-[470px]">
                <div className="relative mx-auto aspect-[0.78] max-w-[360px] rounded-[44px] bg-[#101114] shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
                  <div className="absolute left-1/2 top-10 h-16 w-28 -translate-x-1/2 rounded-b-full border-b border-white/15 bg-black/25" />
                  <div className="absolute left-[8%] top-[18%] h-56 w-20 -rotate-[18deg] rounded-[32px] bg-[#101114] shadow-inner" />
                  <div className="absolute right-[8%] top-[18%] h-56 w-20 rotate-[18deg] rounded-[32px] bg-[#101114] shadow-inner" />
                  <div className="absolute inset-x-[22%] top-[24%] rounded-lg border border-dashed border-white/45 p-5 text-center">
                    <div className="mx-auto flex h-20 w-32 items-center justify-center rounded-lg bg-white text-3xl font-black tracking-tighter text-primary">
                      U:DO
                    </div>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">print zone</p>
                  </div>
                  <div className="absolute bottom-8 left-1/2 h-3 w-32 -translate-x-1/2 rounded-full bg-white/10" />
                </div>

                <div className="absolute right-4 top-10 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Розмір</p>
                  <p className="text-sm font-bold text-foreground">120 × 84 мм</p>
                </div>
                <div className="absolute bottom-10 left-4 rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Сторона</p>
                  <p className="text-sm font-bold text-foreground">Front</p>
                </div>
              </div>
            </div>

            <aside className="border-t border-border bg-card p-4 lg:border-l lg:border-t-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Тираж та ціна</p>

              <div className="mt-4 flex items-center gap-2">
                <button type="button" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground">
                  <Minus className="size-4" />
                </button>
                <div className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border text-xl font-black tabular-nums">
                  50
                </div>
                <button type="button" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground">
                  <Plus className="size-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {["від 10", "від 50", "від 100"].map((tier, index) => (
                  <div key={tier} className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold ${index === 1 ? "border-primary bg-primary text-primary-foreground" : "border-primary/35 text-primary"}`}>
                    {tier}
                    <span className="block text-[10px] opacity-75">−{index === 0 ? 0 : index === 1 ? 8 : 15}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 rounded-lg border border-border bg-background p-4">
                {[
                  ["Худі Classic", "1 240 ₴"],
                  ["DTF front", "180 ₴"],
                  ["Знижка", "−8%"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-3">
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-semibold text-foreground">Разом</span>
                    <span className="text-2xl font-black tracking-tight text-primary">65 320 ₴</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {["Макет збережено", "Шари готові до друку", "Ціна оновлена"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-2">
                {LAYERS.map((layer) => (
                  <div key={layer.name} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                    <span className={`size-3 rounded-full ${layer.color}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{layer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{layer.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shirt className="size-4" />
            </span>
            Працює для футболок, худі, поло, кепок і аксесуарів.
          </div>
          <Link
            href="/order"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
          >
            Відкрити конструктор <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
