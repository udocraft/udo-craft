"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthAlert, AuthBackLink, AuthField, AuthPasswordField, AuthShell, AuthSubmit } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/client";

type View = "login" | "forgot" | "otp" | "new-password" | "done";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const reset = (next: View) => { setView(next); setError(null); };

  // ── Login ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    let supabase;
    try { supabase = createClient(); } catch {
      setError("Не вдалося ініціалізувати вхід.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password }).catch((err: unknown) => {
      console.error("[admin-login] signInWithPassword failed", err);
      return {
        data: { user: null },
        error: err instanceof Error ? err : new Error("Login failed"),
      };
    });
    if (error) {
      console.error("[admin-login] Supabase auth error", {
        name: error.name,
        message: error.message,
        status: "status" in error ? error.status : undefined,
      });
      if (error.message.includes("Invalid login credentials")) setError("Невірний email або пароль.");
      else if (error.message.includes("Email not confirmed")) setError("Email ще не підтверджено.");
      else setError("Щось пішло не так. Спробуйте пізніше.");
      setLoading(false);
      return;
    }

    // First-login: must change password
    if (data.user?.user_metadata?.must_change_password) {
      router.push("/reset-password?first=1");
      return;
    }

    router.push("/");
    router.refresh();
  };

  // ── Forgot — send OTP ─────────────────────────────────────────────────────

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      reset("otp");
    } catch (e: unknown) {
      setError((e as Error).message || "Помилка надсилання");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Введіть 6-значний код"); return; }
    reset("new-password");
  };

  // ── Set new password ──────────────────────────────────────────────────────

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError("Мінімум 8 символів"); return; }
    if (newPassword !== confirmPassword) { setError("Паролі не збігаються"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      reset("done");
    } catch (e: unknown) {
      setError((e as Error).message || "Помилка");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const titles: Record<View, { title: string; desc: string }> = {
    login:        { title: "Вхід до панелі",       desc: "Введіть дані для доступу до адміністративної панелі." },
    forgot:       { title: "Відновлення пароля",   desc: "Вкажіть email — надішлемо 6-значний код." },
    otp:          { title: "Введіть код",           desc: `Код надіслано на ${email}. Дійсний 15 хвилин.` },
    "new-password": { title: "Новий пароль",        desc: "Придумайте надійний пароль. Мінімум 8 символів." },
    done:         { title: "Пароль оновлено",       desc: "Тепер ви можете увійти з новим паролем." },
  };

  const { title, desc } = titles[view];

  return (
    <AuthShell title={title} description={desc}>
      {/* ── Login ── */}
      {view === "login" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <AuthField id="email" label="Email" type="email" inputMode="email" placeholder="you@u-do-craft.store"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
          <AuthPasswordField id="password" label="Пароль" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
            labelRight={
              <button type="button" onClick={() => reset("forgot")}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                Забули пароль?
              </button>
            } />
          <AuthAlert>{error}</AuthAlert>
          <AuthSubmit loading={loading} loadingLabel="Входимо…">Увійти</AuthSubmit>
        </form>
      )}

      {/* ── Forgot — enter email ── */}
      {view === "forgot" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <AuthBackLink onClick={() => reset("login")}>Назад до входу</AuthBackLink>
          <AuthField id="reset-email" label="Email" type="email" inputMode="email" placeholder="you@u-do-craft.store"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
          <AuthAlert>{error}</AuthAlert>
          <AuthSubmit loading={loading} loadingLabel="Надсилаємо…">Надіслати код</AuthSubmit>
        </form>
      )}

      {/* ── OTP entry ── */}
      {view === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <AuthBackLink onClick={() => reset("forgot")}>Назад</AuthBackLink>
          <AuthField id="otp" label="6-значний код" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required autoComplete="one-time-code" autoFocus className="text-center font-mono text-2xl tracking-[0.4em] md:text-2xl" />
          <AuthAlert>{error}</AuthAlert>
          <AuthSubmit disabled={otp.length !== 6}>Підтвердити</AuthSubmit>
          <p className="text-center text-sm text-muted-foreground">
            Не отримали код?{" "}
            <button type="button" onClick={handleSendOtp} className="font-medium text-primary hover:underline">
              Надіслати ще раз
            </button>
          </p>
        </form>
      )}

      {/* ── New password ── */}
      {view === "new-password" && (
        <form onSubmit={handleSetPassword} className="space-y-4">
          <AuthPasswordField id="new-pass" label="Новий пароль" placeholder="Мінімум 8 символів"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" autoFocus />
          <AuthPasswordField id="confirm-pass" label="Підтвердьте пароль" placeholder="••••••••"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          <AuthAlert>{error}</AuthAlert>
          <AuthSubmit loading={loading} loadingLabel="Зберігаємо…">Зберегти пароль</AuthSubmit>
        </form>
      )}

      {/* ── Done ── */}
      {view === "done" && (
        <div className="space-y-6">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-6 text-emerald-600" />
          </div>
          <p className="text-sm text-muted-foreground">
            Пароль успішно змінено для <span className="font-medium text-foreground">{email}</span>.
          </p>
          <AuthSubmit type="button" onClick={() => reset("login")}>Увійти</AuthSubmit>
        </div>
      )}
    </AuthShell>
  );
}
