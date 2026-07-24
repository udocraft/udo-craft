"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { SeoPreview } from "./SeoPreview";
import { RepeaterField } from "./RepeaterField";

const RichField = dynamic(() => import("./RichField"), { ssr: false });

export interface SectionField {
  key: string;
  label: string;
  type: "input" | "textarea" | "rich" | "repeater";
  placeholder?: string;
  fields?: any[];
  itemLabelKey?: string;
}

export interface SectionConfig {
  slug: string;
  label: string;
  fields: SectionField[];
}

// ── Section editor ────────────────────────────────────────────────────────────

export function LandingSectionEditor({
  section,
  onSaved,
}: {
  section: SectionConfig;
  onSaved?: () => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms?slug=${section.slug}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.content?.body ?? {});
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [section.slug]);

  useEffect(() => { load(); }, [load]);

  const set = (key: string, val: unknown) => {
    setData((prev) => {
      const next = { ...prev, [key]: val };
      
      // Notify preview iframe
      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        iframe.contentWindow?.postMessage(
          { type: "CMS_UPDATE", slug: section.slug, body: next },
          "*"
        );
      });
      
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: section.slug, title: section.label, body: data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Збережено");
      onSaved?.();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate">{section.label}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Секція головної сторінки</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={load} disabled={loading} className="h-9 w-9">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} size="sm" className="h-9">
            {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
            Зберегти
          </Button>
        </div>
      </div>

      {/* Fields */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="px-4 md:px-6 py-5 space-y-5">
          {section.fields.map((f) => {
            if (f.type === "repeater") {
              return (
                <div key={f.key} className="pt-2">
                  <RepeaterField
                    label={f.label}
                    items={(data[f.key] as any[]) ?? []}
                    fields={f.fields ?? []}
                    itemLabelKey={f.itemLabelKey}
                    onChange={(val) => set(f.key, val)}
                  />
                </div>
              );
            }
            if (f.type === "rich") {
              return (
                <RichField
                  key={f.key}
                  label={f.label}
                  value={(data[f.key] as unknown[]) ?? []}
                  onChange={(blocks) => set(f.key, blocks)}
                />
              );
            }
            if (f.type === "textarea") {
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={(data[f.key] as string) ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                </div>
              );
            }
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  value={(data[f.key] as string) ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="h-10"
                />
              </div>
            );
          })}

          {/* SEO live preview */}
          {section.slug === "seo_home" && (
            <div className="pt-4 border-t border-border space-y-3">
              <SeoPreview
                title={(data.title as string) ?? ""}
                description={(data.description as string) ?? ""}
                url="u-do-craft.store"
              />
            </div>
          )}

          <div className="pt-2 pb-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="h-10 w-full sm:w-auto">
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
              Зберегти
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
