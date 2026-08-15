"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { sound } from "@/lib/sound";

export function SuccessModal({ email: initialEmail, onClose }: { email: string; onClose: () => void }) {
  const t = useTranslations("checkout.success");
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState(initialEmail);
  const [emailInput, setEmailInput] = useState(!initialEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setIsAuthenticated(!!data.user);
    });
  }, []);

  useEffect(() => {
    import("canvas-confetti").then((mod) => {
      const confetti = mod.default;
      const end = Date.now() + 2500;
      const colors = ["#1B3BFF", "#ffffff", "#22c55e", "#f97316"];
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setError(t("emailLabel")); sound.caution(); return; }
    if (password.length < 6) { setError(t("passwordError")); sound.caution(); return; }
    setLoading(true); setError(null);
    sound.button();
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
      if (signUpErr.message.includes("already registered")) { setAlreadyExists(true); }
      else { setError(t("registrationError")); }
      setLoading(false); return;
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) { setDone(true); } else { sound.celebration(); router.push("/cabinet"); }
    setLoading(false);
  };

  const header = (
    <div className="text-center">
      <div className="inline-flex items-center justify-center size-14 rounded-full bg-emerald-100 mb-3">
        <CheckCircle className="size-7 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t("desc")}</p>
    </div>
  );

  if (isAuthenticated === true) return (
    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
        {header}
        <div className="border-t border-border pt-4 space-y-3">
          <Button className="w-full" onClick={() => router.push("/cabinet")}>
            {t("loginAccount")}
          </Button>
        </div>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
          {t("skip")}
        </button>
      </div>
    </div>
  );

  if (alreadyExists) return (
    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
        {header}
        <div className="border-t border-border pt-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{t("emailExists")}</p>
          <Link href="/cabinet/login"><Button className="w-full">{t("loginAccount")}</Button></Link>
        </div>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">{t("skip")}</button>
      </div>
    </div>
  );

  if (done) return (
    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
        {header}
        <p className="text-sm text-center text-muted-foreground border-t border-border pt-4">
          {t("accountCreated.desc", { email })}
        </p>
        <Link href="/cabinet/login"><Button className="w-full">{t("accountCreated.loginBtn")}</Button></Link>
        <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">{t("accountCreated.homeLink")}</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
        {header}
        {isAuthenticated === null ? (
          <div className="border-t border-border pt-4 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-sm mb-1">{t("createAccount")}</h3>
            <p className="text-xs text-muted-foreground mb-3">{t("createAccountDesc")}</p>
            <form
              onSubmit={emailInput
                ? (e) => { e.preventDefault(); if (!email || !/\S+@\S+\.\S+/.test(email)) { setError(t("emailLabel")); return; } setError(null); setEmailInput(false); }
                : handleCreate}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label>{t("emailLabel")}</Label>
                <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="your@email.com" autoFocus={emailInput}
                  readOnly={!emailInput && !!initialEmail}
                  className={!emailInput && !!initialEmail ? "bg-muted text-muted-foreground" : ""} />
              </div>
              {!emailInput && (
                <div className="space-y-1.5">
                  <Label htmlFor="pw">{t("passwordLabel")}</Label>
                  <div className="relative">
                    <Input id="pw" type={showPw ? "text" : "password"} placeholder={t("passwordPlaceholder")}
                      value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" required autoFocus />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="size-4 animate-spin" /> {t("creating")}</> : emailInput ? "Next →" : t("create")}
              </Button>
            </form>
          </div>
        )}
        <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
          {t("skip")}
        </button>
      </div>
    </div>
  );
}
