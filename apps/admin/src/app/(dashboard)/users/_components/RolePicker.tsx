"use client";

import { Eye, Scissors, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Role, ROLES } from "./user-utils";

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  manager: User,
  sewer: Scissors,
  viewer: Eye,
};

export function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div role="radiogroup" aria-label="Роль" className="grid grid-cols-2 gap-2">
      {ROLES.map((r) => {
        const Icon = ROLE_ICONS[r.value] || User;
        const active = value === r.value;
        return (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r.value)}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
