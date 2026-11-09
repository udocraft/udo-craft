"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/settings-card";

export default function SecurityTab() {
  const supabase = useMemo(() => createClient(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Пароль має бути не менше 6 символів");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Паролі не збігаються");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Помилка зміни пароля");
    else {
      toast.success("Пароль змінено");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  return (
    <SettingsCard description="Змініть пароль облікового запису.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-xs">Новий пароль</Label>
          <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs">Підтвердити пароль</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
        </div>
      </div>
      <Button variant="outline" onClick={handleChange} disabled={saving || !newPassword}>
        {saving && <Loader2 className="size-4 animate-spin" />}
        Змінити пароль
      </Button>
    </SettingsCard>
  );
}
