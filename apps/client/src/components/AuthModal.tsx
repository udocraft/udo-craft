"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth/AuthForm";
import { sound } from "@/lib/sound";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful login or registration */
  onAuthSuccess?: () => void;
  /** Which screen to open on: "login" (default) or "register" */
  initialScreen?: "login" | "register";
}

/**
 * Modal variant of the auth flow. Only used where the user must stay in place
 * (customizer share, paywall). Full-page entry points use AuthPage instead.
 * AuthForm mounts only while open, so each opening starts fresh.
 */
export function AuthModal({ open, onClose, onAuthSuccess, initialScreen = "login" }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-md border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-md">
        <DialogTitle className="sr-only">U:DO CRAFT account</DialogTitle>
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-2xl">
          <button
            type="button"
            onClick={() => { sound.close(); onClose(); }}
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Закрити"
          >
            <X className="size-4" />
          </button>
          <div className="max-h-[min(90dvh,780px)] overflow-y-auto p-6 sm:p-8">
            {open && (
              <AuthForm
                initialScreen={initialScreen}
                onAuthSuccess={() => {
                  onAuthSuccess?.();
                  onClose();
                }}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
