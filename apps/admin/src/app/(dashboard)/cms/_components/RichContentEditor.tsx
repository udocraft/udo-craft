"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, RefreshCw, Eye, EyeOff } from "lucide-react";

interface RichContentEditorProps {
  slug: string;
  pageTitle: string;
  description?: string;
}

export function RichContentEditor({ slug, pageTitle, description }: RichContentEditorProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms?slug=${slug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.content) {
        setTitle(data.content.body?.title ?? "");
        setBody(data.content.body?.content ?? "");
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: pageTitle,
          body: { title, content: body },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Збережено");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button aria-label="Оновити" variant="outline" size="icon" onClick={load}>
            <RefreshCw className="size-4" />
          </Button>
          <Button aria-label="Перемкнути попередній перегляд" aria-pressed={preview} variant="outline" size="icon" onClick={() => setPreview((p) => !p)}>
            {preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Зберегти
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">{title || "(без заголовку)"}</h2>
          <div
            className="prose prose-sm max-w-none text-foreground"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {body || <span className="text-muted-foreground italic">Немає контенту</span>}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Заголовок сторінки</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наприклад: Умови використання"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Контент</Label>
            <p className="text-xs text-muted-foreground">
              Підтримується звичайний текст. Використовуйте порожні рядки для розділення абзаців.
            </p>
            <Textarea
              rows={24}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Введіть текст сторінки..."
              className="font-mono text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
