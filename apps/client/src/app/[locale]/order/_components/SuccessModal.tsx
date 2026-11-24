"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Loader2 } from "lucide-react";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { CONFETTI_COLORS } from "@/lib/canvas-colors";

/**
 * Shown after an order is placed. Signed-in customers go to their cabinet. Everyone else
 * can create an account through the normal sign-up, which emails a code to prove the
 * address: orders and chats are matched to accounts by email, so an account must never
 * be created for an address its owner has not confirmed.
 */
export function SuccessModal({ email, onClose }: { email: string; onClose: () => void }) {
  const t = useTranslations("checkout.success");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }: { data: { user: { id: string } | null } }) => setIsAuthenticated(!!data.user));
  }, []);

  useEffect(() => {
    import("canvas-confetti")
      .then((mod) => {
        const confetti = mod.default;
        const end = Date.now() + 2500;
        const frame = () => {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: CONFETTI_COLORS });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: CONFETTI_COLORS });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      })
      .catch(() => {});
  }, []);

  const query = new URLSearchParams({ returnTo: "/cabinet", ...(email ? { email } : {}) }).toString();

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="order-success-title" className="w-full max-w-md space-y-5 rounded-2xl bg-card p-6 shadow-xl">
        <div className="text-center">
          <div className="mb-3 inline-flex size-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="size-7 text-emerald-600" />
          </div>
          <h2 id="order-success-title" className="text-xl font-bold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("desc")}</p>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          {isAuthenticated === null ? (
            <div className="flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : isAuthenticated ? (
            <Link href="/cabinet" className={buttonVariants({ variant: "primary", className: "w-full" })}>
              {t("loginAccount")}
            </Link>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold">{t("createAccount")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("createAccountDesc")}</p>
              </div>
              <Link href={`/cabinet/register?${query}`} className={buttonVariants({ variant: "primary", className: "w-full" })}>
                {t("create")}
              </Link>
              <Link href={`/cabinet/login?${query}`} className={buttonVariants({ variant: "outline", className: "w-full" })}>
                {t("login")}
              </Link>
            </>
          )}
        </div>

        <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground">
          {t("skip")}
        </button>
      </div>
    </div>
  );
}
