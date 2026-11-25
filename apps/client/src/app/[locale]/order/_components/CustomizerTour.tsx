"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const TOUR_STORAGE_KEY = "udo_customizer_tour_v1";

interface TourStep {
  target: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    target: "tools",
    title: "Інструменти дизайну",
    body: "Завантажте власний файл, оберіть готовий принт, додайте текст або намалюйте щось своє. Усе починається тут.",
  },
  {
    target: "canvas",
    title: "Полотно",
    body: "Перетягуйте, масштабуйте й повертайте елементи просто на виробі. Кнопки під полотном перемикають сторону: перед, зад, рукави.",
  },
  {
    target: "layers",
    title: "Шари",
    body: "Усі елементи макета в одному списку. Змінюйте порядок, дублюйте, видаляйте. Вибраний шар має власну панель налаштувань над полотном.",
  },
  {
    target: "mode",
    title: "Дизайн і превʼю",
    body: "Перемкніться на «Превʼю», щоб побачити макет у кількох ракурсах без інструментів редагування.",
  },
  {
    target: "price",
    title: "Тираж і ціна",
    body: "Оберіть колір, розмір і кількість. Ціна враховує знижку за тираж і вартість друку кожного елемента.",
  },
  {
    target: "actions",
    title: "Замовлення та спільний доступ",
    body: "Коли макет готовий, додайте його до замовлення або надішліть посилання колезі чи клієнту для коментарів.",
  },
];

const POP_W = 320;
const GAP = 14;
const MARGIN = 12;
const PAD = 6;

type Placement = "top" | "bottom" | "left" | "right";
interface Layout {
  rect: { top: number; left: number; width: number; height: number } | null;
  pop: { top: number; left: number };
  placement: Placement | null;
  arrow: number;
}

function findTarget(name: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const el of Array.from(nodes)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function computeLayout(target: HTMLElement | null, popH: number): Layout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw < 640;
  if (!target || narrow) {
    const r = target?.getBoundingClientRect();
    return {
      rect: r ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null,
      pop: { top: 0, left: 0 },
      placement: null,
      arrow: 0,
    };
  }
  const r = target.getBoundingClientRect();
  const rect = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
  const space = {
    right: vw - (rect.left + rect.width),
    left: rect.left,
    bottom: vh - (rect.top + rect.height),
    top: rect.top,
  };
  const fits = (p: Placement) => (p === "left" || p === "right" ? space[p] >= POP_W + GAP + MARGIN : space[p] >= popH + GAP + MARGIN);
  const order: Placement[] = ["right", "left", "bottom", "top"];
  const placement = order.find(fits) ?? (Object.keys(space) as Placement[]).sort((a, b) => space[b] - space[a])[0];
  let top: number;
  let left: number;
  if (placement === "right" || placement === "left") {
    left = placement === "right" ? rect.left + rect.width + GAP : rect.left - GAP - POP_W;
    top = clamp(rect.top + rect.height / 2 - popH / 2, MARGIN, vh - popH - MARGIN);
  } else {
    top = placement === "bottom" ? rect.top + rect.height + GAP : rect.top - GAP - popH;
    left = clamp(rect.left + rect.width / 2 - POP_W / 2, MARGIN, vw - POP_W - MARGIN);
  }
  left = clamp(left, MARGIN, vw - POP_W - MARGIN);
  top = clamp(top, MARGIN, Math.max(MARGIN, vh - popH - MARGIN));
  const arrow = placement === "left" || placement === "right"
    ? clamp(rect.top + rect.height / 2 - top, 20, popH - 20)
    : clamp(rect.left + rect.width / 2 - left, 20, POP_W - 20);
  return { rect, pop: { top, left }, placement, arrow };
}

export function CustomizerTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [reduced, setReduced] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const total = STEPS.length;
  const current = STEPS[step];

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Reset to first step whenever the tour (re)opens, remember focus origin
  useEffect(() => {
    if (!open) return;
    setStep(0);
    returnFocus.current = document.activeElement as HTMLElement | null;
    return () => returnFocus.current?.focus?.();
  }, [open]);

  const reposition = useCallback(() => {
    const target = findTarget(STEPS[step].target);
    setLayout(computeLayout(target, popRef.current?.offsetHeight ?? 180));
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    const target = findTarget(current.target);
    target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    reposition();
    // second pass once the popover has been measured
    const raf = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(raf);
  }, [open, current.target, reposition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (open) nextRef.current?.focus();
  }, [open, step]);

  const goNext = useCallback(() => (step >= total - 1 ? onClose() : setStep(step + 1)), [step, total, onClose]);
  const goBack = useCallback(() => setStep((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); return; }
      if (e.key === "Tab" && popRef.current) {
        const items = Array.from(popRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !popRef.current.contains(active))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (active === last || !popRef.current.contains(active))) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, goNext, goBack, onClose]);

  if (!open || typeof document === "undefined") return null;

  const placement = layout?.placement ?? null;
  const rect = layout?.rect ?? null;
  const motion = reduced ? "" : "transition-[top,left,width,height,opacity] duration-200 ease-out";
  const popStyle: React.CSSProperties = placement
    ? { top: layout!.pop.top, left: layout!.pop.left, width: POP_W }
    : { left: MARGIN, right: MARGIN, bottom: `max(${MARGIN}px, env(safe-area-inset-bottom))`, margin: "0 auto", maxWidth: 420 };

  return createPortal(
    <div className="fixed inset-0 z-[10050]">
      {/* Blocks interaction with the editor while the tour is open */}
      <div className="absolute inset-0" aria-hidden="true" />
      {rect ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-xl ${motion}`}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 9999px rgba(10,10,10,0.55)", outline: "2px solid rgba(255,255,255,0.9)" }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/55" />
      )}
      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="udo-tour-title"
        aria-describedby="udo-tour-body"
        className={`absolute rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl ${motion}`}
        style={popStyle}
      >
        {placement && (
          <span
            aria-hidden="true"
            className="absolute size-3 rotate-45 border-border bg-card"
            style={
              placement === "right" ? { left: -6, top: layout!.arrow - 6, borderLeftWidth: 1, borderBottomWidth: 1 }
              : placement === "left" ? { right: -6, top: layout!.arrow - 6, borderRightWidth: 1, borderTopWidth: 1 }
              : placement === "bottom" ? { top: -6, left: layout!.arrow - 6, borderLeftWidth: 1, borderTopWidth: 1 }
              : { bottom: -6, left: layout!.arrow - 6, borderRightWidth: 1, borderBottomWidth: 1 }
            }
          />
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs tabular-nums text-muted-foreground">{step + 1} з {total}</p>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-11 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Закрити
          </button>
        </div>
        <h2 id="udo-tour-title" className="mt-1 text-base font-semibold leading-snug">{current.title}</h2>
        <p id="udo-tour-body" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="h-11 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:invisible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Назад
          </button>
          <button
            ref={nextRef}
            type="button"
            onClick={goNext}
            className="h-11 min-w-[96px] rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {step === total - 1 ? "Готово" : "Далі"}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">{`Крок ${step + 1} з ${total}: ${current.title}`}</p>
      </div>
    </div>,
    document.body,
  );
}
