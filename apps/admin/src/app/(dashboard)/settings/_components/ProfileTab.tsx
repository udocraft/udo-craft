"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@udo-craft/ui";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SettingsCard } from "@/components/settings-card";
import { FormSkeleton } from "./skeletons";

export default function ProfileTab() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      if (cancelled) return;
      if (user) {
        setEmail(user.email ?? "");
        setFullName(user.user_metadata?.full_name ?? "");
        setAvatarUrl(user.user_metadata?.avatar_url ?? "");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, avatar_url: avatarUrl },
    });
    if (error) toast.error("Помилка оновлення профілю");
    else toast.success("Профіль оновлено");
    setSaving(false);
  };

  if (loading) return <FormSkeleton rows={2} />;

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email.charAt(0).toUpperCase();

  return (
    <SettingsCard>
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarImage src={avatarUrl} alt="" />
          <AvatarFallback className="bg-primary font-semibold text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{fullName || "Admin"}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-xs">Повне ім&apos;я</Label>
          <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ваше ім'я" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input id="email" value={email} disabled autoComplete="email" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatarUrl" className="text-xs">URL аватара</Label>
        <Input id="avatarUrl" type="url" inputMode="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        Зберегти зміни
      </Button>
    </SettingsCard>
  );
}
