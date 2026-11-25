"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthAlert, AuthPasswordField, AuthShell, AuthSubmit } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordInner() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("first") === "1";

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Пароль має містити щонайменше 8 символів."); return; }
    if (password !== confirmPassword) { setError("Паролі не збігаються."); return; }
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });

    if (error) {
      setError("Не вдалося оновити пароль. Спробуйте ще раз.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/"), 1800);
  };

  if (success) {
    return (
      <AuthShell title="Пароль встановлено" description="Зараз повернемо вас до панелі.">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-6 text-emerald-600" />
          </div>
          <p className="text-sm text-muted-foreground">Перенаправляємо…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={isFirstLogin ? "Встановіть пароль" : "Новий пароль"}
      description={
        isFirstLogin
          ? "Це ваш перший вхід. Будь ласка, встановіть власний пароль."
          : "Придумайте надійний пароль. Мінімум 8 символів."
      }
    >
      <form onSubmit={handleReset} className="space-y-4">
        <AuthPasswordField id="new-password" label="Новий пароль" placeholder="Мінімум 8 символів"
          value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" autoFocus />
        <AuthPasswordField id="confirm-password" label="Підтвердьте пароль" placeholder="••••••••"
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
        <AuthAlert>{error}</AuthAlert>
        <AuthSubmit loading={loading} loadingLabel="Зберігаємо…">Зберегти пароль</AuthSubmit>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
