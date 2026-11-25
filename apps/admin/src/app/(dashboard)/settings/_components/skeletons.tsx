import { LogoLoader } from "@udo-craft/ui";

/** Loading state for settings tabs — the shared logo loader, sized to a settings card. */
export function FormSkeleton(_props: { rows?: number }) {
  return <LogoLoader variant="block" className="min-h-[280px] rounded-xl border border-border bg-card" />;
}

export function CardSkeleton(_props: { rows?: number }) {
  return <LogoLoader variant="block" className="min-h-[280px] rounded-xl border border-border bg-card" />;
}
