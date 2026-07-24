"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Key, Package, Truck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings-card";
import { SettingsRow } from "@/components/settings-row";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AdminFormRow } from "@/components/admin-layout";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KeycrmSettings {
  enabled: boolean;
  auto_sync: boolean;
  sync_pages: number;
  api_key?: string;
  last_sync_at?: string;
}

interface NovaPoshtaSettings {
  enabled: boolean;
  api_key?: string;
  sender_ref?: string;
  sender_contact_ref?: string;
  sender_address_ref?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IntegrationsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  
  const [keycrmSettings, setKeycrmSettings] = useState<KeycrmSettings>({
    enabled: true,
    auto_sync: false,
    sync_pages: 2,
    api_key: "",
  });

  const [novaPoshtaSettings, setNovaPoshtaSettings] = useState<NovaPoshtaSettings>({
    enabled: false,
    api_key: "",
    sender_ref: "",
    sender_contact_ref: "",
    sender_address_ref: "",
  });

  const [health, setHealth] = useState<any>(null);

  // ── Fetch initial data ────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/settings?key=keycrm").then(res => res.ok ? res.json() : null),
      fetch("/api/settings?key=nova_poshta").then(res => res.ok ? res.json() : null),
      fetch("/api/health").then(res => res.json())
    ]).then(([keycrmData, novaPoshtaData, healthData]) => {
      if (keycrmData?.value) setKeycrmSettings(keycrmData.value);
      if (novaPoshtaData?.value) setNovaPoshtaSettings(novaPoshtaData.value);
      setHealth(healthData);
      setLoading(false);
    }).catch(() => {
      toast.error("Не вдалося завантажити налаштування");
      setLoading(false);
    });
  }, []);

  // ── Save helpers ──────────────────────────────────────────────────────────

  const saveKeycrmSettings = async (newSettings: KeycrmSettings) => {
    setSaving(prev => ({ ...prev, keycrm: true }));
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "keycrm", value: newSettings })
      });
      if (!res.ok) throw new Error("Failed to save");
      setKeycrmSettings(newSettings);
      toast.success("Налаштування KeyCRM збережено");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(prev => ({ ...prev, keycrm: false }));
    }
  };

  const saveNovaPoshtaSettings = async (newSettings: NovaPoshtaSettings) => {
    setSaving(prev => ({ ...prev, nova_poshta: true }));
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "nova_poshta", value: newSettings })
      });
      if (!res.ok) throw new Error("Failed to save");
      setNovaPoshtaSettings(newSettings);
      toast.success("Налаштування НоваПошта збережено");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(prev => ({ ...prev, nova_poshta: false }));
    }
  };

  // ── KeyCRM sync ───────────────────────────────────────────────────────────

  const handleKeycrmSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/keycrm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Синхронізовано: ${data.created} нових, ${data.updated} оновлено`);
      setKeycrmSettings(prev => ({ ...prev, last_sync_at: new Date().toISOString() }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const envKeycrmConfigured = health?.admin?.env?.KEYCRM_API_KEY === true;
  const envNovaPoshtaConfigured = health?.admin?.env?.NOVA_POSHTA_API_KEY === true;
  const keycrmApiKeyConfigured = envKeycrmConfigured || !!keycrmSettings.api_key;
  const novaPoshtaApiKeyConfigured = envNovaPoshtaConfigured || !!novaPoshtaSettings.api_key;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── KeyCRM ───────────────────────────────────────────────────── */}
      <SettingsCard 
        title={
          <span className="flex items-center gap-2">
            <Package className="size-4 text-primary" />
            KeyCRM Інтеграція
          </span>
        }
        description="Налаштування синхронізації замовлень з KeyCRM."
      >
        <div className="space-y-5">
          <AdminFormRow
            label="API ключ"
            description="Ключ для доступу до KeyCRM API. Можна зберегти тут або у змінній KEYCRM_API_KEY."
          >
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={envKeycrmConfigured ? "Налаштовано через .env" : "Вставте API ключ"}
                value={keycrmSettings.api_key ?? ""}
                onChange={(e) => setKeycrmSettings(prev => ({ ...prev, api_key: e.target.value }))}
                disabled={saving.keycrm}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={() => saveKeycrmSettings(keycrmSettings)}
                disabled={saving.keycrm}
              >
                <Key className="size-3.5 mr-1.5" />
                Зберегти
              </Button>
            </div>
          </AdminFormRow>

          <SettingsRow
            label="Статус API"
            description={keycrmApiKeyConfigured ? "API ключ налаштовано" : "API ключ відсутній"}
            action={
              keycrmApiKeyConfigured ? (
                <StatusIndicator status="ok" label="Готово" />
              ) : (
                <StatusIndicator status="error" label="Не налаштовано" />
              )
            }
          />
          
          <SettingsRow
            label="Увімкнути синхронізацію"
            description="Дозволити отримання замовлень з KeyCRM"
            action={
              <Switch
                checked={keycrmSettings.enabled}
                onCheckedChange={(enabled) => saveKeycrmSettings({ ...keycrmSettings, enabled })}
                disabled={saving.keycrm}
              />
            }
          />
          
          <SettingsRow
            label="Автоматична синхронізація"
            description="Синхронізувати автоматично при відкритті сторінки замовлень"
            disabled={!keycrmSettings.enabled || saving.keycrm}
            action={
              <Switch
                checked={keycrmSettings.auto_sync}
                onCheckedChange={(auto_sync) => saveKeycrmSettings({ ...keycrmSettings, auto_sync })}
                disabled={!keycrmSettings.enabled || saving.keycrm}
              />
            }
          />

          <SettingsRow
            label="Кількість сторінок"
            description="Скільки останніх сторінок замовлень (по 50) перевіряти за раз (1-10)"
            disabled={!keycrmSettings.enabled || saving.keycrm}
            action={
              <Input
                type="number"
                min={1}
                max={10}
                className="w-20 text-center"
                value={keycrmSettings.sync_pages}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= 10) {
                    saveKeycrmSettings({ ...keycrmSettings, sync_pages: val });
                  }
                }}
                disabled={!keycrmSettings.enabled || saving.keycrm}
              />
            }
          />

          <SettingsRow
            label="Остання синхронізація"
            description={keycrmSettings.last_sync_at ? new Date(keycrmSettings.last_sync_at).toLocaleString("uk-UA") : "Ніколи"}
            disabled={!keycrmSettings.enabled}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={handleKeycrmSync}
                disabled={!keycrmSettings.enabled || !keycrmApiKeyConfigured || syncing}
              >
                {syncing ? <Loader2 className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
                Синхронізувати зараз
              </Button>
            }
          />
        </div>
      </SettingsCard>

      {/* ── НоваПошта ───────────────────────────────────────────────── */}
      <SettingsCard 
        title={
          <span className="flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            НоваПошта API
          </span>
        }
        description="Налаштування інтеграції для створення накладних."
      >
        <div className="space-y-5">
          <AdminFormRow
            label="API ключ"
            description="Ключ для доступу до НоваПошта API. Можна зберегти тут або у змінній NOVA_POSHTA_API_KEY."
          >
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={envNovaPoshtaConfigured ? "Налаштовано через .env" : "Вставте API ключ"}
                value={novaPoshtaSettings.api_key ?? ""}
                onChange={(e) => setNovaPoshtaSettings(prev => ({ ...prev, api_key: e.target.value }))}
                disabled={saving.nova_poshta}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={() => saveNovaPoshtaSettings(novaPoshtaSettings)}
                disabled={saving.nova_poshta}
              >
                <Key className="size-3.5 mr-1.5" />
                Зберегти
              </Button>
            </div>
          </AdminFormRow>

          <AdminFormRow
            label="Ref відправника"
            description="GUID відправника (Ref) з вашого особистого кабінету НоваПошта"
          >
            <Input
              placeholder="00000000-0000-0000-0000-000000000000"
              value={novaPoshtaSettings.sender_ref ?? ""}
              onChange={(e) => setNovaPoshtaSettings(prev => ({ ...prev, sender_ref: e.target.value }))}
              disabled={saving.nova_poshta}
              className="font-mono text-xs"
            />
          </AdminFormRow>

          <AdminFormRow
            label="Ref контактної особи"
            description="GUID контактної особи відправника"
          >
            <Input
              placeholder="00000000-0000-0000-0000-000000000000"
              value={novaPoshtaSettings.sender_contact_ref ?? ""}
              onChange={(e) => setNovaPoshtaSettings(prev => ({ ...prev, sender_contact_ref: e.target.value }))}
              disabled={saving.nova_poshta}
              className="font-mono text-xs"
            />
          </AdminFormRow>

          <AdminFormRow
            label="Ref адреси відправника"
            description="GUID адреси складу відправника"
          >
            <Input
              placeholder="00000000-0000-0000-0000-000000000000"
              value={novaPoshtaSettings.sender_address_ref ?? ""}
              onChange={(e) => setNovaPoshtaSettings(prev => ({ ...prev, sender_address_ref: e.target.value }))}
              disabled={saving.nova_poshta}
              className="font-mono text-xs"
            />
          </AdminFormRow>

          <SettingsRow
            label="Статус API"
            description={novaPoshtaApiKeyConfigured ? "API ключ налаштовано" : "API ключ відсутній"}
            action={
              novaPoshtaApiKeyConfigured ? (
                <StatusIndicator status="ok" label="Готово" />
              ) : (
                <StatusIndicator status="error" label="Не налаштовано" />
              )
            }
          />

          <SettingsRow
            label="Увімкнути інтеграцію"
            description="Дозволити створення накладних НоваПошта"
            action={
              <Switch
                checked={novaPoshtaSettings.enabled}
                onCheckedChange={(enabled) => saveNovaPoshtaSettings({ ...novaPoshtaSettings, enabled })}
                disabled={saving.nova_poshta}
              />
            }
          />

          <div className="flex items-end justify-end pt-2">
            <Button
              size="sm"
              onClick={() => saveNovaPoshtaSettings(novaPoshtaSettings)}
              disabled={saving.nova_poshta}
            >
              {saving.nova_poshta && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Зберегти всі налаштування НоваПошта
            </Button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
