"use client";

import { useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  GOOGLE_ENABLED,
  loginWithPasskey,
  loginWithTelegram,
  PASSKEY_ENABLED,
  registerWithPasskey,
  TELEGRAM_BOT_ID,
} from "@/lib/auth/social-client";
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
  /** Prefills the email field (e.g. from the order the visitor just placed). */
  initialEmail?: string;
  /** Called once after a successful sign-in or sign-up. */
  onAuthSuccess?: () => void;
}

export function AuthForm({ initialScreen = "login", initialEmail = "", onAuthSuccess }: AuthFormProps) {
  const t = useTranslations("auth");
  const [supabase] = useState(createClient);
  const [screen, setScreen] = useState<Screen>(initialScreen);

  // Shared credentials: switching login <-> register keeps what the user already typed.
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  // Register-only fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Email verification (register): the server emails the code and returns a signed token.
  const [regToken, setRegToken] = useState("");
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
      fail(t("errors.googleFailed"));
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
      fail(t("errors.passkeyNeedsNameEmail"));
      return;
    }
    setBusy(true);
    sound.button();
    const err = await registerWithPasskey(supabase, name.trim(), email.trim());
    setBusy(false);
    if (err) fail(err);
    else setNotice(t("notices.passkeyCheckEmail", { email: email.trim() }));
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
      fail(t("errors.invalidCredentials"));
      setBusy(false);
    } else {
      finish();
    }
  };

  // ── Register: check email, send code, verify, create account ───────────

  /** Asks the server to email a sign-up code; returns the signed token it hands back. */
  const sendOtp = async (): Promise<string> => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, type: "register" }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: string };
    if (!res.ok || !data.token) throw new Error("send failed");
    return data.token;
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) return fail(t("errors.passwordMin"));
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
          fail(t("errors.emailExistsRegister"));
          setBusy(false);
          return;
        }
      }
      setRegToken(await sendOtp());
      setOtpInput("");
      setResendCooldown(60);
      sound.open();
      setScreen("verify");
    } catch {
      fail(t("errors.codeSendFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (otpInput.length !== 6) return;
    setVerifying(true);
    setError(null);

    // The server checks the code against the token and creates a confirmed account.
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: otpInput, token: regToken, password, name, company, phone }),
    });
    if (!res.ok) {
      const { error: code } = (await res.json().catch(() => ({}))) as { error?: string };
      const key =
        code === "email_exists" ? "errors.emailExistsLogin"
        : code === "code_expired" ? "errors.codeExpired"
        : code === "too_many_attempts" ? "errors.tooManyAttempts"
        : code === "code_invalid" ? "errors.codeInvalid"
        : "errors.registerFailed";
      fail(t(key));
      setVerifying(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setVerifying(false);
    if (!signInError) {
      finish();
    } else {
      setPassword("");
      setNotice(t("notices.accountCreated"));
      setScreen("login");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setError(null);
    try {
      setRegToken(await sendOtp());
    } catch {
      fail(t("errors.codeSendFailed"));
    }
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
      fail(t("errors.resetSendFailed"));
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
    if (resetPassword !== resetConfirm) return fail(t("errors.passwordsMismatch"));
    if (resetPassword.length < 8) return fail(t("errors.passwordMin"));

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
        throw new Error(t("errors.resetFailed"));
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email: resetEmail, password: resetPassword });
      if (!err) {
        finish();
      } else {
        setEmail(resetEmail);
        setPassword("");
        setNotice(t("notices.passwordChanged"));
        setScreen("login");
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : t("errors.generic"));
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

  // Each provider shows only once it is configured; with none, the block and divider are hidden.
  const renderSocial = () => !(GOOGLE_ENABLED || TELEGRAM_BOT_ID || PASSKEY_ENABLED) ? null : (
    <div className="space-y-5">
      <div className="flex justify-center gap-3">
        {GOOGLE_ENABLED && (
          <SocialButton label={t("social.google")} onClick={handleGoogle} disabled={busy}>
            <GoogleIcon className="size-5" />
          </SocialButton>
        )}
        {TELEGRAM_BOT_ID && (
          <SocialButton label={t("social.telegram")} onClick={handleTelegram} disabled={busy}>
            <TelegramIcon className="size-6" />
          </SocialButton>
        )}
        {PASSKEY_ENABLED && (
          <SocialButton
            label={t("social.passkey")}
            onClick={screen === "register" ? handlePasskeyRegister : handlePasskeyLogin}
            disabled={busy}
          >
            <PasskeyGlyph />
          </SocialButton>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("social.or")}
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
            title={isRegister ? t("register.title") : t("login.title")}
            subtitle={isRegister ? t("register.subtitle") : t("login.subtitle")}
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
                  <Field id="auth-name" label={t("fields.name")} autoComplete="name" required value={name} onChange={setName} placeholder={t("fields.namePlaceholder")} />
                  <Field id="auth-company" label={t("fields.company")} autoComplete="organization" value={company} onChange={setCompany} placeholder={t("fields.companyPlaceholder")} />
                  <Field id="auth-phone" label={t("fields.phone")} type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="+380 XX XXX XX XX" />
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
            label={t("fields.password")}
            type={showPw ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            value={password}
            onChange={setPassword}
            placeholder={isRegister ? t("fields.passwordMin") : "••••••••"}
            labelRight={
              !isRegister ? (
                <button
                  type="button"
                  onClick={() => { sound.select(); setResetEmail(email); setScreen("forgot"); }}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("login.forgot")}
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
            {busy ? (isRegister ? t("register.sendingCode") : t("login.signingIn")) : isRegister ? t("register.continue") : t("login.submit")}
          </Button>
        </form>
      </div>
    );
  };

  const renderVerify = () => (
    <div className="space-y-6">
      <BackLink onClick={() => { sound.close(); setScreen("register"); }}>{t("verify.back")}</BackLink>
      <div className="space-y-2 text-center">
        <IconBubble><Mail className="size-6 text-primary" /></IconBubble>
        <h1 className="text-2xl font-bold tracking-tight">{t("verify.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("verify.sentTo")} <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>
      <OTPInput value={otpInput} onChange={(v) => { setOtpInput(v); setError(null); }} />
      {alerts()}
      <Button className="h-12 w-full rounded-xl text-base" onClick={() => { sound.button(); handleVerify(); }} disabled={otpInput.length !== 6 || verifying}>
        {verifying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
        {verifying ? t("verify.checking") : t("verify.confirm")}
      </Button>
      <ResendLine cooldown={resendCooldown} onResend={handleResend} />
    </div>
  );

  const renderForgot = () => (
    <div className="space-y-6">
      <BackLink onClick={() => { sound.close(); setScreen("login"); }}>{t("reset.backToLogin")}</BackLink>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("reset.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reset.subtitle")}</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void sendResetCode(); }} className="space-y-4">
        <Field id="auth-reset-email" label="Email" type="email" autoComplete="email" required value={resetEmail} onChange={setResetEmail} placeholder="you@company.com" />
        {alerts()}
        <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {busy ? t("reset.sending") : t("reset.sendCode")}
        </Button>
      </form>
    </div>
  );

  const renderForgotVerify = () => (
    <div className="space-y-6">
      <BackLink onClick={() => { sound.close(); setScreen("forgot"); }}>{t("reset.changeEmail")}</BackLink>
      <div className="space-y-2 text-center">
        <IconBubble><Mail className="size-6 text-primary" /></IconBubble>
        <h1 className="text-2xl font-bold tracking-tight">{t("reset.enterCode")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("verify.sentTo")} <span className="font-medium text-foreground">{resetEmail}</span>
        </p>
      </div>
      <OTPInput value={otpInput} onChange={(v) => { setOtpInput(v); setError(null); }} />
      {alerts()}
      <Button className="h-12 w-full rounded-xl text-base" onClick={() => { sound.button(); handleForgotVerify(); }} disabled={otpInput.length !== 6}>
        <CheckCircle2 className="mr-2 size-4" />
        {t("verify.confirm")}
      </Button>
      <ResendLine cooldown={resendCooldown} onResend={() => void sendResetCode()} />
    </div>
  );

  const renderNewPassword = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("reset.newTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("reset.newSubtitle")}</p>
      </div>
      <form onSubmit={handleResetPassword} className="space-y-4">
        <Field
          id="auth-new-password"
          label={t("fields.password")}
          type={showResetPw ? "text" : "password"}
          autoComplete="new-password"
          required
          value={resetPassword}
          onChange={setResetPassword}
          placeholder={t("fields.passwordMin")}
          endAction={<ShowToggle shown={showResetPw} onToggle={() => setShowResetPw((v) => !v)} />}
        />
        {resetPassword && <PasswordStrength password={resetPassword} />}
        <Field
          id="auth-confirm-password"
          label={t("fields.confirmPassword")}
          type={showResetPw ? "text" : "password"}
          autoComplete="new-password"
          required
          value={resetConfirm}
          onChange={setResetConfirm}
          placeholder={t("fields.repeatPassword")}
        />
        {alerts()}
        <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {busy ? t("reset.saving") : t("reset.save")}
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
  const t = useTranslations("auth");
  const tabs: { value: AuthMode; label: string }[] = [
    { value: "login", label: t("modes.login") },
    { value: "register", label: t("modes.register") },
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
  const t = useTranslations("auth");
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
            "h-12 rounded-lg border-border bg-background px-4 text-base transition-shadow focus-visible:ring-primary/20",
            endAction && "pr-20",
            invalid && "border-destructive"
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
        {endAction && <div className="absolute right-2 top-1/2 -translate-y-1/2">{endAction}</div>}
      </div>
      {invalid && <p className="text-xs text-destructive">{t("errors.emailFormat")}</p>}
    </div>
  );
}

function ShowToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const t = useTranslations("auth");
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {shown ? t("fields.hide") : t("fields.show")}
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
  const t = useTranslations("auth");
  return (
    <p className="text-center text-sm text-muted-foreground">
      {t("resend.noCode")}{" "}
      {cooldown > 0 ? (
        <span className="tabular-nums">{t("resend.in", { s: cooldown })}</span>
      ) : (
        <button type="button" onClick={onResend} className="font-medium text-primary hover:underline">
          {t("resend.now")}
        </button>
      )}
    </p>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const t = useTranslations("auth");
  const checks = [
    { label: t("strength.length"), ok: password.length >= 8 },
    { label: t("strength.upper"), ok: /[A-Z]/.test(password) },
    { label: t("strength.digit"), ok: /\d/.test(password) },
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
          <span key={c.label} className={cn("text-xs transition-colors", c.ok ? "text-emerald-600" : "text-muted-foreground")}>
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("auth");
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
          aria-label={t("verify.digit", { n: i + 1 })}
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
            "h-14 w-11 rounded-lg border-2 bg-background text-center text-xl font-bold outline-none transition-[transform,opacity,background-color,border-color,color,box-shadow] sm:w-12",
            "focus:border-primary focus:ring-4 focus:ring-primary/15",
            d ? "border-primary text-primary" : "border-border text-foreground"
          )}
        />
      ))}
    </div>
  );
}
