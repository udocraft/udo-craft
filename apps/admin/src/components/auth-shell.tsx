"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogoFull } from "@udo-craft/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Full-screen auth layout, matching the storefront login (apps/client AuthPage):
 * logo top-left, form centred at max-w-md, large left-aligned title, no card.
 */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <main id="main" className="flex min-h-dvh flex-col bg-background px-4 py-6 sm:px-10 lg:px-16">
      <header className="flex items-center gap-2.5">
        <BrandLogoFull className="h-7 w-auto text-primary" color="var(--color-primary)" />
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          Admin
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md space-y-8">
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={title}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          {children}
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground">
        Доступ лише для команди U:DO CRAFT
      </footer>
    </main>
  );
}

/** Labelled input in the storefront auth style (h-12, rounded-xl). */
export function AuthField({
  id,
  label,
  labelRight,
  endAction,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  labelRight?: React.ReactNode;
  endAction?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex min-h-6 items-center justify-between">
        <Label htmlFor={id} className="text-foreground">{label}</Label>
        {labelRight}
      </div>
      <div className="relative">
        <Input
          id={id}
          className={cn(
            "h-12 rounded-lg border-border bg-background px-4 text-base transition-shadow focus-visible:ring-primary/20 md:text-base",
            endAction && "pr-14",
            className,
          )}
          {...props}
        />
        {endAction && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{endAction}</div>}
      </div>
    </div>
  );
}

/** Password field with a show/hide toggle that has a 44px touch target. */
export function AuthPasswordField(props: Omit<React.ComponentProps<typeof AuthField>, "type" | "endAction">) {
  const [shown, setShown] = React.useState(false);
  return (
    <AuthField
      {...props}
      type={shown ? "text" : "password"}
      endAction={
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Приховати пароль" : "Показати пароль"}
          aria-pressed={shown}
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}

export function AuthAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          key="alert"
          role={tone === "error" ? "alert" : "status"}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn(
            "rounded-xl px-4 py-3 text-center text-sm",
            tone === "error" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700",
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AuthSubmit({
  loading,
  loadingLabel,
  icon,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean; loadingLabel?: string; icon?: React.ReactNode }) {
  return (
    <Button type="submit" disabled={loading || props.disabled} className={cn("h-12 w-full rounded-xl text-base", className)} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {loading ? loadingLabel ?? children : children}
    </Button>
  );
}

export function AuthBackLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      ← {children}
    </button>
  );
}
