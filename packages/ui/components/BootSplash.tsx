"use client";

import * as React from "react";
import { LogoMarkShimmer } from "./LogoLoader";

/**
 * Full-screen logo splash for a real page load only (first open or reload).
 * It is in the server HTML, so it covers the page while JS loads, and fades out
 * once React has hydrated. Client-side navigation never shows it again, because
 * the root layout does not remount; route loading uses skeletons.
 */
export function BootSplash({ label = "Завантаження…" }: { label?: string }) {
  const [phase, setPhase] = React.useState<"shown" | "leaving" | "gone">("shown");

  React.useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("leaving"), 150);
    const t2 = window.setTimeout(() => setPhase("gone"), 500);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  if (phase === "gone") return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={phase === "leaving" || undefined}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-300 ease-out motion-reduce:transition-none"
      style={{ opacity: phase === "leaving" ? 0 : 1, pointerEvents: phase === "leaving" ? "none" : "auto" }}
    >
      <LogoMarkShimmer className="w-36 sm:w-44" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
