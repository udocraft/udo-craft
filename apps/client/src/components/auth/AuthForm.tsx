"use client";

import { useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginWithPasskey, loginWithTelegram, registerWithPasskey, TELEGRAM_BOT_ID } from "@/lib/auth/social-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";
import { authCallbackUrl } from "@/lib/auth/redirect";
import { GoogleIcon, TelegramIcon } from "@/components/auth/social-icons";

type Screen = "login" | "register" | "verify" | "forgot" | "forgot-verify" | "new-password";
type AuthMode = "login" | "register";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export interface AuthFormProps {
  initialScreen?: AuthMode;
  /** Called once after a successful sign-in or sign-up. */
  onAuthSuccess?: () => void;
}

export function AuthForm({ initialScreen = "login", onAuthSuccess }: AuthFormProps) {
  const [supabase] = useState(createClient);
  const [screen, setScreen] = useState<Screen>(initialScreen);

  // Shared credentials: switching login <-> register keeps what the user already typed.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  // Register-only fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Email verification (register)
  const [sentOtp, setSentOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Password reset
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  // Clear a stale error whenever the user moves to another step.
  useEffect(() => { setError(null); }, [screen]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const fail = (message: string) => {
    setError(message);
    sound.caution();
  };

  const finish = () => {
    sound.celebration();
    onAuthSuccess?.();
  };

  const switchMode = (next: AuthMode) => {
    if (next === screen) return;
    sound.select();
    setShowPw(false);
    setScreen(next);
  };

  // ── Social ──────────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    sound.button();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl("/cabinet") },
    });
    if (err) {
      fail("Не вдалося увійти через Google. Спробуйте ще раз.");
      setBusy(false);
    }
    // On success the browser leaves for Google, so busy stays set.
  };

  const runSessionTask = async (task: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    sound.button();
    const err = await task();
    if (err) {
      fail(err);
      setBusy(false);
    } else {
      finish();
    }
  };

  const handlePasskeyLogin = () => runSessionTask(() => loginWithPasskey(supabase));
  const handleTelegram = () => runSessionTask(() => loginWithTelegram(supabase));

  const handlePasskeyRegister = async () => {
    setError(null);
    setNotice(null);
    if (!name.trim() || !email.trim()) {
      fail("Вкажіть ім'я та email, щоб створити акаунт з passkey.");
      return;
    }
    setBusy(true);
    sound.button();
    const err = await registerWithPasskey(supabase, name.trim(), email.trim());
    setBusy(false);
    if (err) fail(err);
    else setNotice(`Ми надіслали лист на ${email.trim()}. Підтвердьте email, потім увійдіть через passkey.`);
  };

  // ── Login ───────────────────────────────────────────────────────────────

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    sound.button();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      fail("Невірний email або пароль.");
      setBusy(false);
    } else {
      finish();
    }
  };

  // ── Register: check email, send code, verify, create account ───────────

  const sendOtp = async (): Promise<string> => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code, name, type: "register" }),
    });
    return code;
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) return fail("Пароль має містити щонайменше 8 символів.");
    setBusy(true);
    sound.button();
    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (checkRes.ok) {
        const { exists } = await checkRes.json();
        if (exists) {
          fail("Цей email вже зареєстровано. Увійдіть або скористайтесь відновленням паролю.");
          setBusy(false);
          return;
        }
      }
      setSentOtp(await sendOtp());
      setOtpInput("");
      setResendCooldown(60);
      sound.open();
      setScreen("verify");
    } catch {
      fail("Не вдалося надіслати код. Спробуйте ще раз.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (otpInput.length !== 6) return;
    setVerifying(true);
    setError(null);

    if (otpInput !== sentOtp) {
      fail("Невірний код. Перевірте email та спробуйте ще раз.");
      setVerifying(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, company, phone },
        emailRedirectTo: authCallbackUrl("/order"),
      },
    });
    if (signUpError) {
      fail(
        signUpError.message.includes("already registered")
          ? "Цей email вже зареєстровано. Спробуйте увійти."
          : "Помилка реєстрації. Спробуйте ще раз."
      );
      setVerifying(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setVerifying(false);
    if (!signInError) {
      finish();
    } else {
      // Account exists but could not sign in yet (e.g. email confirmation required).
      setPassword("");
      setNotice("Акаунт створено. Увійдіть з вашим email і паролем.");
      setScreen("login");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setError(null);
    setSentOtp(await sendOtp());
  };

  // ── Password reset ─────────────────────────────────────────────────────

  const sendResetCode = async () => {
    if (!resetEmail) return;
    setBusy(true);
    setError(null);
    sound.button();
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, type: "reset" }),
      });
      if (!res.ok) throw new Error("send failed");
      setOtpInput("");
      setResendCooldown(60);
      setScreen("forgot-verify");
    } catch {
      fail("Не вдалося надіслати код. Перевірте email.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotVerify = () => {
    if (otpInput.length !== 6) return;
    sound.button();
    setScreen("new-password");
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (resetPassword !== resetConfirm) return fail("Паролі не збігаються");
    if (resetPassword.length < 8) return fail("Мінімум 8 символів");

    setBusy(true);
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
      const { error: err } = await supabase.auth.signInWithPassword({ email: resetEmail, password: resetPassword });
      if (!err) {
        finish();
      } else {
        setEmail(resetEmail);
        setPassword("");
        setNotice("Пароль змінено. Увійдіть з новим паролем.");
        setScreen("login");
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  };

  // ── Render helpers (plain functions, not components, so inputs keep focus) ─

  const alerts = () => (
    <>
      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            key="error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      {notice && !error && (
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-700">{notice}</div>
      )}
    </>
  );

  const renderSocial = () => (
    <div className="space-y-5">
      <div className="flex justify-center gap-3">
        <SocialButton label="Продовжити з Google" onClick={handleGoogle} disabled={busy}>
          <GoogleIcon className="size-5" />
        </SocialButton>
        {TELEGRAM_BOT_ID && (
          <SocialButton label="Продовжити з Telegram" onClick={handleTelegram} disabled={busy}>
            <TelegramIcon className="size-6" />
          </SocialButton>
        )}
        <SocialButton
          label="Продовжити з passkey"
          onClick={screen === "register" ? handlePasskeyRegister : handlePasskeyLogin}
          disabled={busy}
        >
          <PasskeyGlyph />
        </SocialButton>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        або
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );

  const renderAuth = () => {
    const isRegister = screen === "register";
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <AnimatedTitle
            title={isRegister ? "Створіть акаунт" : "З поверненням"}
            subtitle={isRegister ? "Це займе менше хвилини." : "Увійдіть, щоб продовжити замовлення."}
          />
        </div>

        <ModeSwitch mode={screen as AuthMode} onChange={switchMode} />

        {renderSocial()}

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4" noValidate={false}>
          <AnimatePresence initial={false}>
            {isRegister && (
              <motion.div
                key="register-fields"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                {/* px/-mx keep the focus ring from being clipped by overflow-hidden */}
                <div className="-mx-1 space-y-4 px-1 pb-4">
                  <Field id="auth-name" label="Ваше ім'я" autoComplete="name" required value={name} onChange={setName} placeholder="Іван Петренко" />
                  <Field id="auth-company" label="Компанія" autoComplete="organization" value={company} onChange={setCompany} placeholder="Назва компанії" />
                  <Field id="auth-phone" label="Телефон" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="+380 XX XXX XX XX" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Field
            id="auth-email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="you@company.com"
            invalid={email.length > 0 && !isEmail(email)}
          />

          <Field
            id="auth-password"
            label="Пароль"
            type={showPw ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            value={password}
            onChange={setPassword}
            placeholder={isRegister ? "Мінімум 8 символів" : "••••••••"}
            labelRight={
              !isRegister ? (
                <button
                  type="button"
                  onClick={() => { sound.select(); setResetEmail(email); setScreen("forgot"); }}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Забули пароль?
                </button>
              ) : null
            }
            endAction={<ShowToggle shown={showPw} onToggle={() => setShowPw((v) => !v)} />}
          />

          <AnimatePresence initial={false}>
            {isRegister && password && (
              <motion.div key="strength" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <PasswordStrength password={password} />
              </motion.div>
            )}
          </AnimatePresence>

          {alerts()}

          <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {busy ? (isRegister ? "Надсилаємо код..." : "Входимо...") : isRegister ? "Продовжити" : "Увійти"}
          </Button>
        </form>
      </div>
    );
  };

  const renderVerify = () => (
    <div className="space-y-6">
      <BackLink onClick={() => { sound.close(); setScreen("register"); }}>Назад</BackLink>
      <div className="space-y-2 text-center">
        <IconBubble><Mail className="size-6 text-primary" /></IconBubble>
        <h1 className="text-2xl font-bold tracking-tight">Перевірте email</h1>
        <p className="text-sm text-muted-foreground">
          Ми надіслали 6-значний код на <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>
      <OTPInput value={otpInput} onChange={(v) => { setOtpInput(v); setError(null); }} />
      {alerts()}
      <Button className="h-12 w-full rounded-xl text-base" onClick={() => { sound.button(); handleVerify(); }} disabled={otpInput.length !== 6 || verifying}>
        {verifying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
        {verifying ? "Перевіряємо..." : "Підтвердити"}
      </Button>
      <ResendLine cooldown={resendCooldown} onResend={handleResend} />
    </div>
  );

  const renderForgot = () => (
    <div className="space-y-6">
      <BackLink onClick={() => { sound.close(); setScreen("login"); }}>Назад до входу</BackLink>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Відновлення пароля</h1>
        <p className="text-sm text-muted-foreground">Вкажіть email — ми надішлемо 6-значний код.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void sendResetCode(); }} className="space-y-4">
        <Field id="auth-reset-email" label="Email" type="email" autoComplete="email" required value={resetEmail} onChange={setResetEmail} placeholder="you@company.com" />
        {alerts()}
        <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {busy ? "Надсилаємо..." : "Надіслати код"}
        </Button>
      </form>
    </div>
  );

  const renderForgotVerify = () => (
    <div className="space-y-6">
      <BackLink onClick={() => { sound.close(); setScreen("forgot"); }}>Змінити email</BackLink>
      <div className="space-y-2 text-center">
        <IconBubble><Mail className="size-6 text-primary" /></IconBubble>
        <h1 className="text-2xl font-bold tracking-tight">Введіть код</h1>
        <p className="text-sm text-muted-foreground">
          Ми надіслали 6-значний код на <span className="font-medium text-foreground">{resetEmail}</span>
        </p>
      </div>
      <OTPInput value={otpInput} onChange={(v) => { setOtpInput(v); setError(null); }} />
      {alerts()}
      <Button className="h-12 w-full rounded-xl text-base" onClick={() => { sound.button(); handleForgotVerify(); }} disabled={otpInput.length !== 6}>
        <CheckCircle2 className="mr-2 size-4" />
        Підтвердити
      </Button>
      <ResendLine cooldown={resendCooldown} onResend={() => void sendResetCode()} />
    </div>
  );

  const renderNewPassword = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Новий пароль</h1>
        <p className="text-sm text-muted-foreground">Придумайте новий надійний пароль.</p>
      </div>
      <form onSubmit={handleResetPassword} className="space-y-4">
        <Field
          id="auth-new-password"
          label="Пароль"
          type={showResetPw ? "text" : "password"}
          autoComplete="new-password"
          required
          value={resetPassword}
          onChange={setResetPassword}
          placeholder="Мінімум 8 символів"
          endAction={<ShowToggle shown={showResetPw} onToggle={() => setShowResetPw((v) => !v)} />}
        />
        {resetPassword && <PasswordStrength password={resetPassword} />}
        <Field
          id="auth-confirm-password"
          label="Підтвердьте пароль"
          type={showResetPw ? "text" : "password"}
          autoComplete="new-password"
          required
          value={resetConfirm}
          onChange={setResetConfirm}
          placeholder="Повторіть пароль"
        />
        {alerts()}
        <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {busy ? "Зберігаємо..." : "Зберегти пароль"}
        </Button>
      </form>
    </div>
  );

  const isAuthStep = screen === "login" || screen === "register";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={isAuthStep ? "auth" : screen}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {isAuthStep && renderAuth()}
        {screen === "verify" && renderVerify()}
        {screen === "forgot" && renderForgot()}
        {screen === "forgot-verify" && renderForgotVerify()}
        {screen === "new-password" && renderNewPassword()}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Building blocks (module level so their identity stays stable) ──────────

function AnimatedTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: AuthMode; onChange: (m: AuthMode) => void }) {
  const tabs: { value: AuthMode; label: string }[] = [
    { value: "login", label: "Вхід" },
    { value: "register", label: "Реєстрація" },
  ];
  return (
    <div role="tablist" className="relative grid grid-cols-2 rounded-full bg-muted p-1">
      {tabs.map((tab) => {
        const active = mode === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative h-10 rounded-full text-sm font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="auth-mode-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Field({
  id,
  label,
  labelRight,
  endAction,
  invalid,
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  labelRight?: ReactNode;
  endAction?: ReactNode;
  invalid?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-foreground">{label}</Label>
        {labelRight}
      </div>
      <div className="relative">
        <Input
          id={id}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-12 rounded-xl border-border bg-background px-4 text-base transition-shadow focus-visible:ring-primary/20",
            endAction && "pr-20",
            invalid && "border-destructive"
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
        {endAction && <div className="absolute right-2 top-1/2 -translate-y-1/2">{endAction}</div>}
      </div>
      {invalid && <p className="text-xs text-destructive">Перевірте формат email</p>}
    </div>
  );
}

function ShowToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {shown ? "Сховати" : "Показати"}
    </button>
  );
}

function SocialButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-12 items-center justify-center rounded-full border border-border bg-background transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm active:translate-y-0 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function PasskeyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M21 12v2" />
    </svg>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return <div className="mx-auto mb-2 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">{children}</div>;
}

function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" /> {children}
    </button>
  );
}

function ResendLine({ cooldown, onResend }: { cooldown: number; onResend: () => void }) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Не отримали код?{" "}
      {cooldown > 0 ? (
        <span className="tabular-nums">Повторно через {cooldown}с</span>
      ) : (
        <button type="button" onClick={onResend} className="font-medium text-primary hover:underline">
          Надіслати ще раз
        </button>
      )}
    </p>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ символів", ok: password.length >= 8 },
    { label: "Велика літера", ok: /[A-Z]/.test(password) },
    { label: "Цифра", ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-destructive", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < score ? colors[score] : "bg-border")} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span key={c.label} className={cn("text-[11px] transition-colors", c.ok ? "text-emerald-600" : "text-muted-foreground")}>
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs: (HTMLInputElement | null)[] = [];
  const digits = value.padEnd(6, " ").split("").slice(0, 6).map((d) => (d === " " ? "" : d));

  const setDigit = (i: number, d: string) => {
    const next = [...digits];
    next[i] = d;
    onChange(next.join("").replace(/ /g, ""));
  };

  return (
    <div className="flex justify-center gap-2" onPaste={(e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      onChange(pasted);
      refs[Math.min(pasted.length, 5)]?.focus();
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Цифра ${i + 1}`}
          maxLength={1}
          value={d}
          onChange={(e) => {
            const clean = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(i, clean);
            if (clean) sound.type();
            if (clean && i < 5) refs[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) refs[i - 1]?.focus();
          }}
          className={cn(
            "h-14 w-11 rounded-xl border-2 bg-background text-center text-xl font-bold outline-none transition-all sm:w-12",
            "focus:border-primary focus:ring-4 focus:ring-primary/15",
            d ? "border-primary text-primary" : "border-border text-foreground"
          )}
        />
      ))}
    </div>
  );
}
