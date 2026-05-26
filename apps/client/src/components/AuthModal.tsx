"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { X, ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, User, Building2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";

// ── Types ─────────────────────────────────────────────────────────────────

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful login or registration */
  onAuthSuccess?: () => void;
  /** Which screen to open on: "login" (default) or "register" */
  initialScreen?: "login" | "register";
}

// ── OTP input ─────────────────────────────────────────────────────────────

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    onChange(next.join(""));
    if (clean) sound.type();
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            "w-10 h-12 text-center text-lg font-bold rounded-xl border-2 bg-background outline-none transition-all",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            digits[i] ? "border-primary text-primary" : "border-border text-foreground"
          )}
        />
      ))}
    </div>
  );
}

// ── Password strength ─────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ символів", ok: password.length >= 8 },
    { label: "Велика літера", ok: /[A-Z]/.test(password) },
    { label: "Цифра", ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-destructive", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i < score ? colors[score] : "bg-border")} />
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {checks.map((c) => (
          <span key={c.label} className={cn("text-[10px]", c.ok ? "text-emerald-600" : "text-muted-foreground")}>
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function AuthModal({ open, onClose, onAuthSuccess, initialScreen = "login" }: AuthModalProps) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<"login" | "register" | "verify" | "forgot" | "forgot-verify" | "new-password">(initialScreen);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register state
  const [regName, setRegName] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // OTP / verify state
  const [sentOtp, setSentOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Mount guard for portal
  useEffect(() => { setMounted(true); }, []);

  // Reset screen when modal opens
  useEffect(() => {
    if (open) {
      setScreen(initialScreen ?? "login");
      setLoginError(null);
      setRegError(null);
      setOtpError(null);
      setResetError(null);
      setOtpInput("");
    }
  }, [open, initialScreen]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (!open) return null;
  if (!mounted) return null;

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    sound.button();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      setLoginError("Невірний email або пароль.");
      sound.caution();
      setLoginLoading(false);
    } else {
      sound.celebration();
      onAuthSuccess?.();
      onClose();
    }
  };

  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setResetError(null);
    sound.button();
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, type: "reset" }),
      });
      if (!res.ok) throw new Error("Помилка надсилання коду");
      setOtpInput("");
      setResendCooldown(60);
      setScreen("forgot-verify");
    } catch {
      setResetError("Не вдалося надіслати код. Перевірте email.");
      sound.caution();
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotVerify = async () => {
    if (otpInput.length !== 6) return;
    sound.button();
    setScreen("new-password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (resetPassword !== resetConfirmPassword) { setResetError("Паролі не збігаються"); sound.caution(); return; }
    if (resetPassword.length < 8) { setResetError("Мінімум 8 символів"); sound.caution(); return; }
    
    setResetLoading(true);
    sound.button();
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp: otpInput, newPassword: resetPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Помилка");
      }
      
      // Auto login with new password
      const { error } = await supabase.auth.signInWithPassword({ email: resetEmail, password: resetPassword });
      if (!error) {
        sound.celebration();
        onAuthSuccess?.();
        onClose();
      } else {
        setScreen("login");
      }
    } catch (e: any) {
      setResetError(e.message);
      sound.caution();
    } finally {
      setResetLoading(false);
    }
  };

  const sendOtp = async (): Promise<string> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: regEmail, otp: code, name: regName, type: "register" }),
    });
    return code;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (regPassword.length < 8) { setRegError("Пароль має містити щонайменше 8 символів."); sound.caution(); return; }
    setRegLoading(true);
    sound.button();
    try {
      // Check if email already exists before sending OTP
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });
      if (checkRes.ok) {
        const { exists } = await checkRes.json();
        if (exists) {
          setRegError("Цей email вже зареєстровано. Увійдіть або скористайтесь відновленням паролю.");
          setRegLoading(false);
          return;
        }
      }
      const code = await sendOtp();
      setSentOtp(code);
      setOtpInput("");
      setOtpError(null);
      setResendCooldown(60);
      sound.open();
      setScreen("verify");
    } catch {
      setRegError("Не вдалося надіслати код. Спробуйте ще раз.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otpInput.length !== 6) return;
    setVerifying(true);
    setOtpError(null);

    if (otpInput !== sentOtp) {
      setOtpError("Невірний код. Перевірте email та спробуйте ще раз.");
      sound.caution();
      setVerifying(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { full_name: regName, company: regCompany, phone: regPhone },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/order`,
      },
    });

    if (signUpError) {
      setOtpError(
        signUpError.message.includes("already registered")
          ? "Цей email вже зареєстровано. Спробуйте увійти."
          : "Помилка реєстрації. Спробуйте ще раз."
      );
      sound.caution();
      setVerifying(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: regEmail, password: regPassword });
    setVerifying(false);
    if (!signInError) {
      sound.celebration();
      onAuthSuccess?.();
      onClose();
    } else {
      // Signed up but auto-login failed — close modal, user can log in manually
      onClose();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setOtpError(null);
    const code = await sendOtp();
    setSentOtp(code);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-[10010] flex items-center justify-center px-4">
      {/* Backdrop — blurred, site visible behind */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-md"
        onClick={() => { sound.close(); onClose(); }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-card rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Close */}
        <button
          type="button"
          onClick={() => { sound.close(); onClose(); }}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10"
          aria-label="Закрити"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5 max-h-[90dvh] overflow-y-auto">

          {/* ── LOGIN ── */}
          {screen === "login" && (
            <>
              <button onClick={() => { sound.close(); onClose(); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5" /> Закрити
              </button>
              <div>
                <h2 className="font-bold text-xl">Вхід</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Немає акаунту?{" "}
                  <button type="button" onClick={() => { sound.select(); setScreen("register"); }} className="text-primary font-medium hover:underline">
                    Зареєструватись
                  </button>
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-login-email" type="email" placeholder="hr@company.com" value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pw-login-password">Пароль</Label>
                    <button type="button" onClick={() => { sound.select(); setResetEmail(loginEmail); setScreen("forgot"); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Забули пароль?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-login-password" type={showLoginPw ? "text" : "password"} placeholder="••••••••"
                      value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      required autoComplete="current-password" className="pl-9 pr-10" />
                    <button type="button" tabIndex={-1} onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showLoginPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                {loginError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{loginError}</div>}
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {loginLoading ? "Входимо..." : "Увійти"}
                </Button>
              </form>
            </>
          )}

          {/* ── REGISTER ── */}
          {screen === "register" && (
            <>
              <button onClick={() => { sound.close(); setScreen("login"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5" /> Назад
              </button>
              <div>
                <h2 className="font-bold text-xl">Створити акаунт</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Вже є акаунт?{" "}
                  <button type="button" onClick={() => { sound.select(); setScreen("login"); }} className="text-primary font-medium hover:underline">
                    Увійти
                  </button>
                </p>
              </div>
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reg-name">Ваше ім&apos;я *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reg-name" type="text" placeholder="Іван Петренко" value={regName}
                      onChange={(e) => setRegName(e.target.value)} required autoComplete="name" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reg-company">Компанія</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reg-company" type="text" placeholder="Назва компанії" value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)} autoComplete="organization" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reg-phone">Телефон</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reg-phone" type="tel" placeholder="+380 XX XXX XX XX" value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)} autoComplete="tel" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reg-email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reg-email" type="email" placeholder="hr@company.com" value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)} required autoComplete="email" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reg-password">Пароль *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reg-password" type={showRegPw ? "text" : "password"} placeholder="Мінімум 8 символів"
                      value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                      required autoComplete="new-password" className="pl-9 pr-10" />
                    <button type="button" tabIndex={-1} onClick={() => setShowRegPw(!showRegPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showRegPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {regPassword && <PasswordStrength password={regPassword} />}
                </div>
                {regError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{regError}</div>}
                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {regLoading ? "Надсилаємо код..." : "Продовжити"}
                </Button>
              </form>
            </>
          )}

          {/* ── VERIFY OTP ── */}
          {screen === "verify" && (
            <>
              <button onClick={() => { sound.close(); setScreen("register"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5" /> Назад
              </button>
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 mb-2">
                  <Mail className="size-6 text-primary" />
                </div>
                <h2 className="font-bold text-xl">Перевірте email</h2>
                <p className="text-sm text-muted-foreground">
                  Ми надіслали 6-значний код на{" "}
                  <span className="font-medium text-foreground">{regEmail}</span>
                </p>
              </div>
              <div className="space-y-4">
                <OTPInput value={otpInput} onChange={(v) => { setOtpInput(v); setOtpError(null); }} />
                {otpError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{otpError}</div>
                )}
                <Button className="w-full" onClick={() => { sound.button(); handleVerify(); }} disabled={otpInput.length !== 6 || verifying}>
                  {verifying ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                  {verifying ? "Перевіряємо..." : "Підтвердити"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Не отримали код?{" "}
                  {resendCooldown > 0 ? (
                    <span>Повторно через {resendCooldown}с</span>
                  ) : (
                    <button onClick={handleResend} className="text-primary font-medium hover:underline">
                      Надіслати ще раз
                    </button>
                  )}
                </p>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {screen === "forgot" && (
            <>
              <button onClick={() => { sound.close(); setScreen("login"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5" /> Назад до входу
              </button>
              <div>
                <h2 className="font-bold text-xl">Відновлення пароля</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Вкажіть email — ми надішлемо 6-значний код для відновлення доступу.
                </p>
              </div>
              <form onSubmit={handleForgotSend} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reset-email" type="email" placeholder="hr@company.com" value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)} required autoComplete="email" className="pl-9" />
                  </div>
                </div>
                {resetError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{resetError}</div>}
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {resetLoading ? "Надсилаємо..." : "Надіслати код"}
                </Button>
              </form>
            </>
          )}

          {/* ── FORGOT OTP VERIFY ── */}
          {screen === "forgot-verify" && (
            <>
              <button onClick={() => { sound.close(); setScreen("forgot"); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5" /> Змінити email
              </button>
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 mb-2">
                  <Lock className="size-6 text-primary" />
                </div>
                <h2 className="font-bold text-xl">Введіть код</h2>
                <p className="text-sm text-muted-foreground">
                  Ми надіслали 6-значний код на{" "}
                  <span className="font-medium text-foreground">{resetEmail}</span>
                </p>
              </div>
              <div className="space-y-4">
                <OTPInput value={otpInput} onChange={(v) => { setOtpInput(v); setOtpError(null); }} />
                {otpError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{otpError}</div>
                )}
                <Button className="w-full" onClick={() => { sound.button(); handleForgotVerify(); }} disabled={otpInput.length !== 6}>
                  <CheckCircle2 className="size-4 mr-2" />
                  Підтвердити
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Не отримали код?{" "}
                  {resendCooldown > 0 ? (
                    <span>Повторно через {resendCooldown}с</span>
                  ) : (
                    <button onClick={handleForgotSend} className="text-primary font-medium hover:underline">
                      Надіслати ще раз
                    </button>
                  )}
                </p>
              </div>
            </>
          )}

          {/* ── NEW PASSWORD ── */}
          {screen === "new-password" && (
            <>
              <div>
                <h2 className="font-bold text-xl">Новий пароль</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Придумайте новий надійний пароль для вашого акаунту.
                </p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reset-new">Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reset-new" type={showLoginPw ? "text" : "password"} placeholder="Мінімум 8 символів"
                      value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                      required autoComplete="new-password" className="pl-9 pr-10" />
                    <button type="button" tabIndex={-1} onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showLoginPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {resetPassword && <PasswordStrength password={resetPassword} />}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-reset-confirm">Підтвердьте пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="pw-reset-confirm" type={showLoginPw ? "text" : "password"} placeholder="Мінімум 8 символів"
                      value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)}
                      required autoComplete="new-password" className="pl-9" />
                  </div>
                </div>
                {resetError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{resetError}</div>}
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading && <Loader2 className="size-4 animate-spin mr-2" />}
                  {resetLoading ? "Зберігаємо..." : "Зберегти пароль"}
                </Button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
