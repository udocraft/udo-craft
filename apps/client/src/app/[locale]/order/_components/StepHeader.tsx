"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Check } from "lucide-react";

type Step = "select" | "contact" | "review";

interface StepHeaderProps {
  step: Step;
  stepIdx: number;
  cartLength: number;
  onNavigate: (s: Step) => void;
}

const STEPS: Step[] = ["select", "contact", "review"];

export function StepHeader({ step, stepIdx, cartLength, onNavigate }: StepHeaderProps) {
  const t = useTranslations("checkout");

  const stepLabels: Record<Step, string> = {
    select: t("stepCart"),
    contact: t("stepForm"),
    review: t("stepReview"),
  };

  return (
    <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center overflow-hidden border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl">
      <Link
        href="/"
        className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("backAriaLabel")}
      >
        <ArrowLeft className="size-4" />
      </Link>
      <p className="z-10 ml-3 hidden shrink-0 text-sm font-semibold tracking-tight md:block">{t("orderTitle")}</p>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {STEPS.map((s, i) => {
            const isVisited = i <= stepIdx;
            const isCurrent = i === stepIdx;
            const canNavigate = i < stepIdx || (step === "select" && s === "contact" && cartLength > 0);
            return (
              <div key={s} className="flex items-center gap-1.5">
                <button
                  onClick={() => canNavigate ? onNavigate(s) : undefined}
                  disabled={!canNavigate}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex items-center gap-1.5 transition-opacity ${canNavigate ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                >
                  <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${i < stepIdx ? "bg-primary/10 text-primary" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i < stepIdx ? <Check className="size-3" /> : i + 1}
                  </div>
                  <span className={`hidden text-xs font-medium sm:block ${isCurrent ? "text-foreground" : isVisited ? "text-foreground/70" : "text-muted-foreground"}`}>
                    {stepLabels[s]}
                  </span>
                </button>
                {i < 2 && <div className="h-px w-4 bg-border sm:w-8" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="z-10 ml-auto w-10 shrink-0" />
    </div>
  );
}
