"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SystemTab } from "./_components/SystemTab";
import { IntegrationsTab } from "./_components/IntegrationsTab";
import { AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import { SettingsCard } from "@/components/settings-card";
import { SettingsRow } from "@/components/settings-row";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "profile" | "security" | "notifications" | "system" | "integrations";

const TABS = [
  { key: "profile", label: "Профіль" },
  { key: "security", label: "Безпека" },
  { key: "notifications", label: "Сповіщення" },
  { key: "system", label: "Система" },
  { key: "integrations", label: "Інтеграції" },
] as const;

// ── Skeleton primitives ───────────────────────────────────────────────────────

/** Simulates a settings card with labeled inputs — used for profile/security tabs */
function FormSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      {/* Avatar / header row */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      {/* Input rows */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-36 rounded-full" />
    </div>
  );
}

/** Simulates a settings card with toggle rows — used for notifications / system / integrations */
function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }: { data: { user: import("@supabase/supabase-js").User | null } }) => {
        if (user) {
          setEmail(user.email ?? "");
          setFullName(user.user_metadata?.full_name ?? "");
          setAvatarUrl(user.user_metadata?.avatar_url ?? "");
        }
        setLoading(false);
      });
  }, [supabase]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, avatar_url: avatarUrl },
    });
    if (error) toast.error("Помилка оновлення профілю");
    else toast.success("Профіль оновлено");
    setSaving(false);
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email.charAt(0).toUpperCase();

  if (loading) return <FormSkeleton rows={2} />;

  return (
    <SettingsCard>
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{fullName || "Admin"}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-xs">
            Повне ім&apos;я
          </Label>
          <Input
            id="fullName"
            className="h-11 text-sm rounded-full"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ваше ім'я"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs">
            Email
          </Label>
          <Input
            id="email"
            className="h-11 text-sm opacity-60 rounded-full"
            value={email}
            disabled
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatarUrl" className="text-xs">
          URL аватара
        </Label>
        <Input
          id="avatarUrl"
          className="h-11 text-sm rounded-full"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <Button size="default" onClick={handleSaveProfile} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Зберегти зміни
      </Button>
    </SettingsCard>
  );
}

// ── Security tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  const supabase = useMemo(() => createClient(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Пароль має бути не менше 6 символів");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Паролі не збігаються");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Помилка зміни пароля");
    else {
      toast.success("Пароль змінено");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  return (
    <SettingsCard description="Змініть пароль облікового запису.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-xs">
            Новий пароль
          </Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="h-11 text-sm rounded-full"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" hidden className="text-xs">
            Підтвердити пароль
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="h-11 text-sm rounded-full"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>
      <Button
        size="default"
        onClick={handlePasswordChange}
        disabled={changingPassword || !newPassword}
        variant="outline"
      >
        {changingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
        Змінити пароль
      </Button>
    </SettingsCard>
  );
}

// ── Notifications tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const [ordersNotif, setOrdersNotif] = useState(true);
  const [msgsNotif, setMsgsNotif] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const get = (k: string, def = true) => {
      const v = localStorage.getItem(k);
      return v === null ? def : v !== "false";
    };
    setOrdersNotif(get("notif_orders"));
    setMsgsNotif(get("notif_msgs"));
    setSoundEnabled(get("notif_sound"));
  }, []);

  const set = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  return (
    <SettingsCard>
      <SettingsRow
        label="Нові замовлення"
        description="Сповіщення коли клієнт створює нове замовлення"
        action={
          <Switch
            checked={ordersNotif}
            onCheckedChange={(v) => set("notif_orders", v, setOrdersNotif)}
          />
        }
      />
      <SettingsRow
        label="Нові повідомлення"
        description="Сповіщення коли клієнт надсилає повідомлення"
        action={
          <Switch
            checked={msgsNotif}
            onCheckedChange={(v) => set("notif_msgs", v, setMsgsNotif)}
          />
        }
      />
      <Separator />
      <SettingsRow
        label="Звук"
        description="Відтворювати звук при нових сповіщеннях"
        disabled={!ordersNotif && !msgsNotif}
        action={
          <Switch
            checked={soundEnabled}
            onCheckedChange={(v) => set("notif_sound", v, setSoundEnabled)}
            disabled={!ordersNotif && !msgsNotif}
          />
        }
      />
    </SettingsCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "profile") as Tab;

  return (
    <DashboardPage
      title="Налаштування"
      toolbar={
        <AdminTabs
          tabs={TABS}
          value={tab}
          onValueChange={(next) => router.push(`/settings?tab=${next}`)}
          className="px-4 md:px-6"
        />
      }
    >
      <div className="px-4 md:px-6 py-6 flex justify-center">
      <div className="w-full max-w-2xl space-y-4">

        {tab === "profile" && (
          <Suspense fallback={<FormSkeleton rows={2} />}>
            <ProfileTab />
          </Suspense>
        )}

        {tab === "security" && (
          <Suspense fallback={<FormSkeleton rows={1} />}>
            <SecurityTab />
          </Suspense>
        )}

        {tab === "notifications" && (
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <NotificationsTab />
          </Suspense>
        )}

        {tab === "system" && (
          <Suspense fallback={<CardSkeleton rows={4} />}>
            <SystemTab />
          </Suspense>
        )}

        {tab === "integrations" && (
          <Suspense fallback={<CardSkeleton rows={3} />}>
            <IntegrationsTab />
          </Suspense>
        )}

      </div>
      </div>
    </DashboardPage>
  );
}
