"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type Step = "catalog" | "checkout" | "review";

interface StepHeaderProps {
  step: Step;
  cartLength: number;
  /** Required contact fields are filled; the Review step stays locked until then. */
  contactComplete: boolean;
  onNavigate: (s: Step) => void;
}

const STEPS: Step[] = ["catalog", "checkout", "review"];
const STEP_LABELS: Record<Step, string> = {
  catalog: "Товари",
  checkout: "Контакти",
  review: "Перевірка",
};

export function StepHeader({ step, cartLength, contactComplete, onNavigate }: StepHeaderProps) {
  const router = useRouter();
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <SidebarTrigger className="-ml-1.5 z-10 size-9 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" />
      <Separator orientation="vertical" className="z-10 h-5" />
      <button
        type="button"
        onClick={() => router.push("/orders")}
        aria-label="Назад до замовлень"
        className="z-10 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </button>

      <div className="z-10 hidden min-w-0 flex-col md:flex">
        <h1 className="text-lg font-semibold leading-tight tracking-tight md:text-xl">Нове замовлення</h1>
        <p className="text-xs text-muted-foreground">Крок {stepIdx + 1} з {STEPS.length} · {STEP_LABELS[step]}</p>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto bg-muted/60 p-1 rounded-xl border border-border">
          {STEPS.map((s, i) => {
            const isCurrent = i === stepIdx;
            const isVisited = i < stepIdx;
            const forwardOk = cartLength > 0 && (s !== "review" || contactComplete);
            const canNavigate = i < stepIdx || (i > stepIdx && forwardOk);
            const lockedHint = i > stepIdx && !forwardOk
              ? (cartLength === 0 ? "Спершу додайте товар" : "Спершу заповніть ім'я і телефон")
              : undefined;
            
            return (
              <React.Fragment key={s}>
                <button
                  onClick={() => canNavigate ? onNavigate(s) : undefined}
                  disabled={!canNavigate}
                  title={lockedHint}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all ${
                    isCurrent 
                      ? "bg-background text-primary shadow-sm border border-border/50 scale-105" 
                      : canNavigate 
                      ? "text-muted-foreground hover:text-foreground hover:bg-background/40" 
                      : "text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  <div className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
                    isVisited 
                      ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20" 
                      : isCurrent 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                      : "bg-muted text-muted-foreground/60"
                  }`}>
                    {isVisited ? <Check className="size-3 stroke-[3]" /> : i + 1}
                  </div>
                  <span className={`text-xs font-bold hidden sm:block ${isCurrent ? "text-foreground" : "text-muted-foreground/60"}`}>
                    {STEP_LABELS[s]}
                  </span>
                </button>
                {i < 2 && <div className="w-4 h-px bg-border/40 mx-0.5" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="ml-auto z-10 flex items-center gap-3">
        {cartLength > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-xl border border-primary/10">
            <span className="text-[10px] font-black uppercase tracking-wider">Кошик</span>
            <span className="text-xs font-bold">{cartLength}</span>
          </div>
        )}
      </div>
    </div>
  );
}

