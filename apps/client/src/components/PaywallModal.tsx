"use client";

import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { sound } from "@/lib/sound";

// PaywallModal = AI-specific gate that shows a "choice" screen first,
// then delegates to AuthModal for the actual login/register flow.

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export function PaywallModal({ open, onClose, onAuthSuccess }: PaywallModalProps) {
  const t = useTranslations("editor");
  const [mounted, setMounted] = useState(false);
  const [authScreen, setAuthScreen] = useState<"login" | "register" | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) setAuthScreen(null); // reset to choice screen on open
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // If user picked login or register, hand off to AuthModal
  if (authScreen) {
    return (
      <AuthModal
        open={true}
        onClose={onClose}
        onAuthSuccess={onAuthSuccess}
        initialScreen={authScreen}
      />
    );
  }

  // Choice screen — AI-specific copy
  return createPortal(
    <div className="fixed inset-0 z-[10010] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { sound.close(); onClose(); }} aria-hidden="true" />
      <div className="relative bg-card rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
        <button type="button" onClick={() => { sound.close(); onClose(); }}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t("common.close")}>
          <X className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-14 rounded-full bg-primary/10 mb-3">
            <Sparkles className="size-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{t("paywall.title")}</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t("paywall.text")}
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-1">
          <Button className="w-full" onClick={() => { sound.button(); setAuthScreen("register"); }}>
            {t("paywall.register")}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => { sound.button(); setAuthScreen("login"); }}>
            {t("paywall.login")}
          </Button>
        </div>
        <button type="button" onClick={() => { sound.close(); onClose(); }}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
          {t("paywall.skip")}
        </button>
      </div>
    </div>,
    document.body
  );
}
