import * as React from "react";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

/** One labelled contact/meta line: icon, value (optionally a link) and a muted label. */
export function InfoRow({ icon: Icon, value, label, href }: { icon: IconType; value: string; label?: string; href?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 items-center gap-1.5">
        {href ? (
          <a href={href} className="truncate text-sm text-primary hover:underline">{value}</a>
        ) : (
          <span className="truncate text-sm text-foreground/90">{value}</span>
        )}
        {label && <span className="shrink-0 text-xs text-muted-foreground">· {label}</span>}
      </div>
    </div>
  );
}

/** A row of 2-4 headline numbers shown above a detail page's content. */
export function StatRow({ stats }: { stats: { label: string; value: string; positive?: boolean }[] }) {
  return (
    <div className="grid divide-x divide-border overflow-hidden rounded-lg border border-border bg-card" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center justify-center gap-0.5 px-2 py-3 text-center">
          <p className={cn("w-full truncate text-sm font-bold tabular-nums", s.positive ? "text-success" : "text-foreground")}>{s.value}</p>
          <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
