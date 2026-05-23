"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SystemTab } from "./_components/SystemTab";
import { AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";

function NotifRow({ label, desc, checked, onChange, disabled }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

type Tab = "profile" | "security" | "notifications" | "system";

const TABS = [
  { key: "profile", label: "Профіль" },
  { key: "security", label: "Безпека" },
  { key: "notifications", label: "Сповіщення" },
  { key: "system", label: "Система" },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "profile") as Tab;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [ordersNotif, setOrdersNotif] = useState(true);
  const [msgsNotif, setMsgsNotif] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const get = (k: string, def = true) => { const v = localStorage.getItem(k); return v === null ? def : v !== "false"; };
    setOrdersNotif(get("notif_orders"));
    setMsgsNotif(get("notif_msgs"));
    setSoundEnabled(get("notif_sound"));
  }, []);

  const set = (key: string, val: boolean, setter: (v: boolean) => void) => { setter(val); localStorage.setItem(key, String(val)); };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: import("@supabase/supabase-js").User | null } }) => {
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
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, avatar_url: avatarUrl } });
    if (error) toast.error("Помилка оновлення профілю");
    else toast.success("Профіль оновлено");
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error("Пароль має бути не менше 6 символів"); return; }
    if (newPassword !== confirmPassword) { toast.error("Паролі не збігаються"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Помилка зміни пароля");
    else { toast.success("Пароль змінено"); setNewPassword(""); setConfirmPassword(""); }
    setChangingPassword(false);
  };

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DashboardPage
      title="Налаштування"
      tabs={<AdminTabs tabs={TABS} value={tab} onValueChange={(next) => router.push(`/settings?tab=${next}`)} />}
      contentClassName="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center"
    >
        <div className="w-full max-w-2xl space-y-4">

          {tab === "profile" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{fullName || "Admin"}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Повне ім&apos;я</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ваше ім'я" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled autoComplete="email" className="opacity-60" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL аватара</Label>
                <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Зберегти зміни
              </Button>
            </div>
          )}

          {tab === "security" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <p className="text-sm text-muted-foreground">Змініть пароль облікового запису.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Новий пароль</Label>
                  <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Підтвердити пароль</Label>
                  <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <Button onClick={handlePasswordChange} disabled={changingPassword || !newPassword} variant="outline">
                {changingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
                Змінити пароль
              </Button>
            </div>
          )}

          {tab === "notifications" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <NotifRow
                label="Нові замовлення"
                desc="Сповіщення коли клієнт створює нове замовлення"
                checked={ordersNotif}
                onChange={(v) => set("notif_orders", v, setOrdersNotif)}
              />
              <NotifRow
                label="Нові повідомлення"
                desc="Сповіщення коли клієнт надсилає повідомлення"
                checked={msgsNotif}
                onChange={(v) => set("notif_msgs", v, setMsgsNotif)}
              />
              <Separator />
              <NotifRow
                label="Звук"
                desc="Відтворювати звук при нових сповіщеннях"
                checked={soundEnabled}
                onChange={(v) => set("notif_sound", v, setSoundEnabled)}
                disabled={!ordersNotif && !msgsNotif}
              />
            </div>
          )}

          {tab === "system" && <SystemTab />}

        </div>
    </DashboardPage>
  );
}
