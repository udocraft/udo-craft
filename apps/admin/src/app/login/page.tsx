"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogIn, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type View = "login" | "forgot" | "otp" | "new-password" | "done";

const ALLOWED_ROLES = ["admin", "manager", "seamstress", "sewer"];

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    const role: string | undefined = data.user?.user_metadata?.role;
    if (!role || !ALLOWED_ROLES.includes(role)) {
      await supabase.auth.signOut();
      setError("Доступ заборонено. Цей обліковий запис не має прав адміністратора.");
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
      <Card>
        <CardContent className="pt-6 space-y-4">

          {/* ── Login ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@u-do-craft.store" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  <button type="button" onClick={() => reset("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Забули пароль?
                  </button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    autoComplete="current-password" className="pr-10" />
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowPassword(!showPassword); }}
                    tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                {loading ? "Входимо..." : "Увійти"}
              </Button>
            </form>
          )}

          {/* ── Forgot — enter email ── */}
          {view === "forgot" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <button onClick={() => reset("login")} type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5" /> Назад до входу
              </button>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" placeholder="admin@u-do-craft.store"
                  value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {loading ? "Надсилаємо..." : "Надіслати код"}
              </Button>
            </form>
          )}

          {/* ── OTP entry ── */}
          {view === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <button onClick={() => reset("forgot")} type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5" /> Назад
              </button>
              <div className="space-y-2">
                <Label htmlFor="otp">6-значний код</Label>
                <Input id="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required autoComplete="one-time-code" className="text-center text-2xl tracking-[0.3em] font-mono" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                <KeyRound className="size-4" /> Підтвердити
              </Button>
              <button type="button" onClick={handleSendOtp}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
                Надіслати код повторно
              </button>
            </form>
          )}

          {/* ── New password ── */}
          {view === "new-password" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pass">Новий пароль</Label>
                <div className="relative">
                  <Input id="new-pass" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    required autoComplete="new-password" className="pr-10" />
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowPassword(!showPassword); }}
                    tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pass">Підтвердьте пароль</Label>
                <Input id="confirm-pass" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  required autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                {loading ? "Зберігаємо..." : "Зберегти пароль"}
              </Button>
            </form>
          )}

          {/* ── Done ── */}
          {view === "done" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-100 p-4">
                  <CheckCircle2 className="size-8 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Пароль успішно змінено для <span className="font-medium text-foreground">{email}</span>.
              </p>
              <Button className="w-full" onClick={() => reset("login")}>
                Увійти
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </AuthShell>
  );
}
