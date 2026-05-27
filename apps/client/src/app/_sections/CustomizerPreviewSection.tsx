"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Check,
  Layers,
  Minus,
  PackageOpen,
  Palette,
  Plus,
  Shirt,
  Type,
  Upload,
} from "lucide-react";

const TOOLS = [
  { label: "Товар", icon: PackageOpen, active: false },
  { label: "Колір", icon: Palette, active: false },
  { label: "Принти", icon: Layers, active: true },
  { label: "Текст", icon: Type, active: false },
  { label: "Файл", icon: Upload, active: false },
];

const LAYERS = [
  { name: "Front logo", meta: "DTF · 120 мм" },
  { name: "Back label", meta: "Вишивка · 48 мм" },
  { name: "Sleeve mark", meta: "DTF · 32 мм" },
];

export function CustomizerPreviewSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative overflow-hidden border-t border-border bg-white py-24 sm:py-32" aria-labelledby="customizer-preview-heading">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-20">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Онлайн-конструктор
          </p>
          <h2 id="customizer-preview-heading" className="mt-5 text-4xl font-semibold leading-[1.03] tracking-tight text-foreground sm:text-6xl">
            Зберіть мерч прямо в інтерфейсі
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Реальний робочий простір для вибору товару, кольору, принтів, шарів і тиражної ціни перед оформленням замовлення.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-14 max-w-6xl"
        >
          <div className="pointer-events-none relative overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_30px_100px_rgba(15,23,42,0.10)]">
            <div className="flex h-12 items-center justify-between border-b border-border bg-[#f7f7f7] px-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-[#e7e7e7]" />
                <span className="size-3 rounded-full bg-[#e7e7e7]" />
                <span className="size-3 rounded-full bg-[#e7e7e7]" />
              </div>
              <div className="hidden rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:block">
                Hoodie Classic · Front
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">U:DO Studio</p>
            </div>

            <div className="grid min-h-[640px] lg:grid-cols-[72px_260px_1fr_300px]">
              <aside className="hidden border-r border-border bg-white p-2 lg:block">
                <div className="grid gap-1">
                  {TOOLS.map(({ label, icon: Icon, active }) => (
                    <button
                      key={label}
                      type="button"
                      disabled
                      className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-semibold ${
                        active ? "bg-foreground text-background" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </aside>

              <aside className="hidden border-r border-border bg-white p-4 lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Товар</p>
                <div className="mt-4 rounded-2xl border border-border bg-[#f7f7f7] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-xl bg-white">
                      <Shirt className="size-6 text-foreground" strokeWidth={1.7} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Hoodie Classic</p>
                      <p className="text-xs text-muted-foreground">від 1 240 ₴</p>
                    </div>
                  </div>
                </div>

                <p className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Колір</p>
                <div className="mt-3 flex gap-2">
                  {["bg-[#101114]", "bg-[#f4f4f1]", "bg-[#c7d1d7]", "bg-[#6f7f68]"].map((color, index) => (
                    <span key={color} className={`size-8 rounded-full border ${index === 0 ? "border-foreground ring-2 ring-foreground/15" : "border-border"} ${color}`} />
                  ))}
                </div>

                <p className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Принти</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["U:DO", "TEAM", "DROP", "2026"].map((item, index) => (
                    <div key={item} className={`aspect-square rounded-2xl border p-3 ${index === 0 ? "border-foreground bg-foreground text-background" : "border-border bg-white text-foreground"}`}>
                      <span className="text-lg font-semibold tracking-tight">{item}</span>
                      <span className="mt-7 block text-[10px] font-semibold uppercase tracking-wide opacity-55">print</span>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden bg-[#f7f7f7] p-5 sm:p-8">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:56px_56px]" />
                <div className="relative w-full max-w-[480px]">
                  <div className="relative mx-auto aspect-[0.78] max-w-[350px] rounded-[44px] bg-[#111214] shadow-[0_35px_90px_rgba(15,23,42,0.22)]">
                    <div className="absolute left-1/2 top-9 h-16 w-28 -translate-x-1/2 rounded-b-full border-b border-white/15 bg-black/20" />
                    <div className="absolute left-[7%] top-[18%] h-56 w-20 -rotate-[18deg] rounded-[32px] bg-[#111214]" />
                    <div className="absolute right-[7%] top-[18%] h-56 w-20 rotate-[18deg] rounded-[32px] bg-[#111214]" />
                    <div className="absolute inset-x-[22%] top-[24%] rounded-2xl border border-dashed border-white/45 p-5 text-center">
                      <div className="mx-auto flex h-20 w-32 items-center justify-center rounded-xl bg-white text-3xl font-semibold tracking-tighter text-foreground">
                        U:DO
                      </div>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">print zone</p>
                    </div>
                    <div className="absolute bottom-8 left-1/2 h-3 w-32 -translate-x-1/2 rounded-full bg-white/10" />
                  </div>

                  <div className="absolute right-2 top-8 rounded-2xl border border-border bg-white px-3 py-2 shadow-lg">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Розмір</p>
                    <p className="text-sm font-semibold text-foreground">120 x 84 мм</p>
                  </div>
                </div>
              </div>

              <aside className="border-t border-border bg-white p-4 lg:border-l lg:border-t-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Тираж та ціна</p>

                <div className="mt-4 flex items-center gap-2">
                  <button type="button" disabled className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <Minus className="size-4" />
                  </button>
                  <div className="flex h-11 flex-1 items-center justify-center rounded-full border border-border text-xl font-semibold tabular-nums">
                    50
                  </div>
                  <button type="button" disabled className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <Plus className="size-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {["10+", "50+", "100+"].map((tier, index) => (
                    <div key={tier} className={`rounded-full border px-2 py-2 text-center text-xs font-semibold ${index === 1 ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}>
                      {tier}
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-3 rounded-2xl border border-border bg-[#f7f7f7] p-4">
                  {[
                    ["Hoodie Classic", "1 240 ₴"],
                    ["DTF front", "180 ₴"],
                    ["Знижка", "-8%"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-end justify-between">
                      <span className="text-sm font-semibold text-foreground">Разом</span>
                      <span className="text-2xl font-semibold tracking-tight text-foreground">65 320 ₴</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  {["Макет збережено", "Шари готові", "Ціна оновлена"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span className="flex size-5 items-center justify-center rounded-full bg-white text-foreground">
                        <Check className="size-3" />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-2">
                  {LAYERS.map((layer) => (
                    <div key={layer.name} className="rounded-2xl border border-border bg-white p-3">
                      <p className="truncate text-sm font-semibold text-foreground">{layer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{layer.meta}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex min-h-[270px] flex-col items-center justify-end bg-gradient-to-b from-white/0 via-white/88 to-white px-5 pb-10 text-center">
              <Link
                href="/order"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background shadow-[0_18px_50px_rgba(15,23,42,0.18)] transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98]"
              >
                Відкрити конструктор
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
