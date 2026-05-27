"use client";

import { useState, useRef } from "react";
import { RefreshCw, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Category } from "@udo-craft/shared";

// ── Helpers ───────────────────────────────────────────────────────────────────

const UA_MAP: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ye",ж:"zh",з:"z",и:"y",і:"i",
  ї:"yi",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",
  ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ь:"",ю:"yu",я:"ya",
};

const slugify = (s: string) =>
  s.toLowerCase().split("").map(c => UA_MAP[c] ?? c).join("")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CategoryDialogProps {
  category?: Category;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CategoryDialog({ category, open, onClose, onSaved }: CategoryDialogProps) {
  const isEdit = !!category?.id;

  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
    image_url: category?.image_url ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form when dialog opens with new category data
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleNameChange = (name: string) => {
    setForm(f => ({
      ...f,
      name,
      // Only auto-generate slug if it hasn't been manually edited
      slug: f.slug === slugify(f.name) || f.slug === "" ? slugify(name) : f.slug,
    }));
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      fd.append("tags", "category");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const { results } = await res.json();
      if (results?.[0]?.url) {
        setForm(f => ({ ...f, image_url: results[0].url }));
        toast.success("Зображення завантажено");
      }
    } catch {
      toast.error("Помилка завантаження");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Назва та slug обов'язкові");
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/categories/${category!.id}` : "/api/categories";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? "Категорію оновлено" : "Категорію створено");
      onSaved();
      onClose();
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редагувати категорію" : "Нова категорія"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Назва */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Назва *</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Футболка"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-slug">Slug *</Label>
            <Input
              id="cat-slug"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="futbolka"
              className="font-mono text-sm"
            />
          </div>

          {/* Порядок */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-order">Порядок сортування</Label>
            <Input
              id="cat-order"
              type="number"
              min="0"
              value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>

          {/* Активна — Switch instead of checkbox */}
          <div className="flex items-center gap-3">
            <Switch
              id="cat-active"
              checked={form.is_active}
              onCheckedChange={checked => setForm(f => ({ ...f, is_active: checked }))}
            />
            <Label htmlFor="cat-active" className="cursor-pointer">Активна</Label>
          </div>

          {/* Зображення */}
          <div className="space-y-1.5">
            <Label>Зображення</Label>
            <div className="flex items-center gap-3">
              <div
                className="relative w-14 h-14 border-2 border-dashed border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {form.image_url ? (
                  <img src={form.image_url} alt="Category" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-5 h-5 text-muted-foreground opacity-40" />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
              />
              <Input
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="URL зображення..."
                className="flex-1 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Збереження..." : isEdit ? "Зберегти" : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
