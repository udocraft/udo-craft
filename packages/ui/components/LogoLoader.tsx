"use client";

import * as React from "react";
import { cn } from "../lib/utils";

/**
 * U:DO logo loader — the brand mark filled with the primary colour and a light
 * sweep running across it. Use it wherever content is loading instead of
 * skeleton blocks.
 *
 *   variant="fullscreen" — covers the viewport (route-level app loading)
 *   variant="block"      — centred in its container with a minimum height (default for panels/lists)
 *   variant="inline"     — just the mark, for buttons, cells and small slots
 *
 * Colour comes from `--color-primary` (both apps define it); pass `color` to override.
 * The sweep stops under `prefers-reduced-motion`, leaving a gentle opacity pulse.
 */

// U:DO mark (U, colon, D, O) — 780×240 viewBox
const PATHS = [
  "M0 0H87.2727V109.091H109.091V0H196.364V141.818C196.364 204.545 152.406 240 98.1818 240C43.9575 240 0 201.818 0 141.818V0Z",
  "M278.182 70.9091C278.182 88.9841 263.529 103.636 245.454 103.636C227.379 103.636 212.727 88.9841 212.727 70.9091C212.727 52.8343 227.379 38.1818 245.454 38.1818C263.529 38.1818 278.182 52.8343 278.182 70.9091Z",
  "M278.182 169.091C278.182 187.166 263.529 201.818 245.454 201.818C227.379 201.818 212.727 187.166 212.727 169.091C212.727 151.016 227.379 136.364 245.454 136.364C263.529 136.364 278.182 151.016 278.182 169.091Z",
  "M403.636 109.091H294.545V0H402.424C479.091 0 522.424 53.7258 522.424 120C522.424 186.274 475.758 240 402.424 240H294.545V130.909H403.636V109.091Z",
  "M778.786 120.244C778.786 182.841 730.861 234.244 669.695 239.756V131.154H647.878V239.756C586.717 234.244 538.788 182.841 538.788 120.244C538.788 53.9703 592.513 0.244446 658.788 0.244446C725.059 0.244446 778.786 53.9703 778.786 120.244Z",
];

const STYLES = `
@keyframes udo-logo-sweep { 0% { transform: translateX(-320px) skewX(-18deg); } 100% { transform: translateX(1100px) skewX(-18deg); } }
@keyframes udo-logo-breathe { 0%,100% { opacity: 1; } 50% { opacity: .72; } }
.udo-logo-sweep { animation: udo-logo-sweep 1.5s cubic-bezier(.45,.05,.35,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .udo-logo-sweep { animation: none; opacity: 0; }
  .udo-logo-mark { animation: udo-logo-breathe 1.8s ease-in-out infinite; }
}
`;

export interface LogoMarkShimmerProps {
  className?: string;
  color?: string;
}

/** The animated mark alone (no wrapper, no a11y status). Width via className, e.g. `w-24`. */
export function LogoMarkShimmer({ className, color = "var(--color-primary, #1f3ccf)" }: LogoMarkShimmerProps) {
  const id = React.useId().replace(/:/g, "");
  const clip = `udo-clip-${id}`;
  const grad = `udo-grad-${id}`;
  return (
    <svg
      viewBox="0 0 780 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("udo-logo-mark h-auto shrink-0", className)}
    >
      <style>{STYLES}</style>
      <defs>
        <clipPath id={clip}>
          {PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </clipPath>
        <linearGradient id={grad} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="780" height="240" fill={color} />
        <rect className="udo-logo-sweep" x="0" y="-40" width="260" height="320" fill={`url(#${grad})`} />
      </g>
    </svg>
  );
}

export interface LogoLoaderProps {
  variant?: "fullscreen" | "block" | "inline";
  /** Accessible status text (announced, visually hidden). */
  label?: string;
  className?: string;
  /** Classes for the mark itself — mostly to change its width. */
  markClassName?: string;
  color?: string;
}

export function LogoLoader({
  variant = "fullscreen",
  label = "Завантаження…",
  className,
  markClassName,
  color,
}: LogoLoaderProps) {
  const status = <span className="sr-only">{label}</span>;

  if (variant === "inline") {
    return (
      <span role="status" aria-live="polite" className={cn("inline-flex items-center", className)}>
        <LogoMarkShimmer className={cn("w-10", markClassName)} color={color} />
        {status}
      </span>
    );
  }

  if (variant === "block") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn("flex min-h-[240px] w-full flex-1 items-center justify-center py-12", className)}
      >
        <LogoMarkShimmer className={cn("w-24", markClassName)} color={color} />
        {status}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("fixed inset-0 z-[9999] flex items-center justify-center bg-background", className)}
    >
      <LogoMarkShimmer className={cn("w-36 sm:w-44", markClassName)} color={color} />
      {status}
    </div>
  );
}
