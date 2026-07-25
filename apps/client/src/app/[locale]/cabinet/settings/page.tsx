"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogoFull } from "@/components/brand-logo";
import { ArrowLeft, Loader2, Eye, EyeOff, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { LogoLoader } from "@udo-craft/ui";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [edrpou, setEdrpou] = useState("");
  const [socialChannel, setSocialChannel] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Auth check and prefill
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/cabinet/login");
        return;
      }
      setUser({ email: authUser.email!, id: authUser.id });

      // Fetch last order to prefill profile
      const { data: leads } = await supabase
        .from("leads")
        .select("customer_data")
        .eq("customer_data->>email", authUser.email!)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (leads?.customer_data) {
        const cd = leads.customer_data;
        if (cd.name) setContactName(cd.name);
        if (cd.company) setCompanyName(cd.company);
        if (cd.phone) setPhone(cd.phone);
        if (cd.edrpou) setEdrpou(cd.edrpou);
        if (cd.social_channel) setSocialChannel(cd.social_channel);
      }
      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      // Update user metadata with profile info
      const { error } = await supabase.auth.updateUser({
        data: {
          contact_name: contactName,
          company_name: companyName,
          phone,
          edrpou,
          social_channel: socialChannel,
        },
      });

      if (error) throw error;
      toast.success("Профіль оновлено");
    } catch (error) {
      toast.error(`Помилка: ${error instanceof Error ? error.message : "невідома"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Новий пароль має бути не менше 6 символів");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Паролі не збігаються");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("Новий пароль має відрізнятися від поточного");
      return;
    }

    setChangingPassword(true);

    try {
      // First verify current password by attempting to sign in
      if (user) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          setPasswordError("Поточний пароль невірний");
          setChangingPassword(false);
          return;
        }
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Пароль змінено");
    } catch (error) {
      setPasswordError(`Помилка: ${error instanceof Error ? error.message : "невідома"}`);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </button>
          <Link href="/" aria-label="U:DO CRAFT">
            <BrandLogoFull className="h-6 w-auto text-primary" color="var(--color-primary, #1B18AC)" />
          </Link>
          <span className="text-muted-foreground text-sm hidden sm:block">/ Налаштування</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="size-4" />
          <span className="hidden sm:block">Вийти</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Profile Section */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-lg">Профіль</h2>
              <p className="text-sm text-muted-foreground mt-1">Ваші контактні дані для замовлень</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email} readOnly className="bg-muted text-muted-foreground cursor-not-allowed" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">Ім'я та прізвище</Label>
                  <Input
                    id="contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Іван Петренко"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Назва компанії</Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ТОВ «Назва»"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+380 XX XXX XX XX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edrpou">ЄДРПОУ / Реквізити</Label>
                  <Input
                    id="edrpou"
                    value={edrpou}
                    onChange={(e) => setEdrpou(e.target.value)}
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="social">Telegram / Instagram</Label>
                <Input
                  id="social"
                  value={socialChannel}
                  onChange={(e) => setSocialChannel(e.target.value)}
                  placeholder="@username або посилання"
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {saving ? "Зберігаємо..." : "Зберегти профіль"}
              </Button>
            </form>
          </div>

          {/* Password Section */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-lg">Безпека</h2>
              <p className="text-sm text-muted-foreground mt-1">Змініть пароль до вашого кабінету</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Поточний пароль</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Введіть поточний пароль"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">Новий пароль</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Мінімум 6 символів"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Підтвердіть новий пароль</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторіть новий пароль"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}

              <Button type="submit" disabled={changingPassword} className="w-full">
                {changingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {changingPassword ? "Змінюємо..." : "Змінити пароль"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
