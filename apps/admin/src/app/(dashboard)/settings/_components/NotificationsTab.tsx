"use client";

import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { SettingsCard } from "@/components/settings-card";
import { SettingsRow } from "@/components/settings-row";

type Prefs = { notif_orders: boolean; notif_msgs: boolean; notif_sound: boolean };
const DEFAULTS: Prefs = { notif_orders: true, notif_msgs: true, notif_sound: true };

function readPrefs(): Prefs {
  const next = { ...DEFAULTS };
  try {
    (Object.keys(DEFAULTS) as (keyof Prefs)[]).forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) next[k] = v !== "false";
    });
  } catch {
    /* storage unavailable: fall back to defaults */
  }
  return next;
}

export default function NotificationsTab() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => { setPrefs(readPrefs()); }, []);

  const set = (key: keyof Prefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    try { localStorage.setItem(key, String(value)); } catch { /* ignore */ }
  };

  const noneEnabled = !prefs.notif_orders && !prefs.notif_msgs;

  return (
    <SettingsCard>
      <SettingsRow
        label="Нові замовлення"
        description="Сповіщення коли клієнт створює нове замовлення"
        action={<Switch aria-label="Нові замовлення" checked={prefs.notif_orders} onCheckedChange={(v) => set("notif_orders", v)} />}
      />
      <Separator />
      <SettingsRow
        label="Нові повідомлення"
        description="Сповіщення коли клієнт надсилає повідомлення"
        action={<Switch aria-label="Нові повідомлення" checked={prefs.notif_msgs} onCheckedChange={(v) => set("notif_msgs", v)} />}
      />
      <Separator />
      <SettingsRow
        label="Звук"
        description="Відтворювати звук при нових сповіщеннях"
        disabled={noneEnabled}
        action={<Switch aria-label="Звук" checked={prefs.notif_sound} onCheckedChange={(v) => set("notif_sound", v)} disabled={noneEnabled} />}
      />
    </SettingsCard>
  );
}
