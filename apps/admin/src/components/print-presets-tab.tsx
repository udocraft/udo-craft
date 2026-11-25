"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Pencil, Plus, RefreshCw, Tag, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────

interface PrintPreset {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string;
  file_url: string;
  tags: string[];
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM = {
  name: "",
  category: "",
  tags: "",        // comma-separated string in the form
  sort_order: 0,
  is_active: true,
};

// ── Component ─────────────────────────────────────────────────────────────

export default function PrintPresetsTab({
  onCreateActionReady,
  showHeaderAction = true,
}: {
  onCreateActionReady?: (handler: () => void) => void;
  showHeaderAction?: boolean;
}) {
  const [presets, setPresets] = useState<PrintPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrintPreset | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PrintPreset | null>(null);

  // File upload state
  const [fileFile, setFileFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [uploadedThumbUrl, setUploadedThumbUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("print_presets")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) {
        if (error.message.includes("schema cache") || error.message.includes("does not exist") || error.code === "42P01") {
          setTableExists(false);
        } else {
          toast.error(error.message);
        }
      } else {
        setPresets((data as PrintPreset[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  // ── Upload helpers ────────────────────────────────────────────────────

  const uploadFile = async (file: File, tag: string): Promise<string> => {
    const fd = new FormData();
    fd.append("files", file);
    fd.append("tags", tag);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.results?.[0]?.url ?? data.urls?.[0] ?? "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "thumb") => {
    const f = e.target.files?.[0];
    if (!f) return;
    const preview = URL.createObjectURL(f);
    if (type === "file") { setFileFile(f); setFilePreview(preview); setUploadedFileUrl(""); }
    else { setThumbFile(f); setThumbPreview(preview); setUploadedThumbUrl(""); }
    e.target.value = "";
  };

  // ── Modal ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFileFile(null); setThumbFile(null);
    setFilePreview(""); setThumbPreview("");
    setUploadedFileUrl(""); setUploadedThumbUrl("");
    setModalOpen(true);
  };

  useEffect(() => {
    onCreateActionReady?.(openCreate);
  }, [onCreateActionReady]);

  const openEdit = (p: PrintPreset) => {
    setEditing(p);
    setForm({ name: p.name, category: p.category, tags: p.tags.join(", "), sort_order: p.sort_order, is_active: p.is_active });
    setFileFile(null); setThumbFile(null);
    setFilePreview(p.file_url); setThumbPreview(p.thumbnail_url);
    setUploadedFileUrl(p.file_url); setUploadedThumbUrl(p.thumbnail_url);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Назва обов'язкова"); return; }

    setSaving(true);
    try {
      // Upload files if new ones selected
      let fileUrl = uploadedFileUrl;
      let thumbUrl = uploadedThumbUrl;

      if (fileFile) {
        setUploadingFile(true);
        fileUrl = await uploadFile(fileFile, "print-preset");
        setUploadedFileUrl(fileUrl);
        setUploadingFile(false);
      }
      if (thumbFile) {
        setUploadingThumb(true);
        thumbUrl = await uploadFile(thumbFile, "print-preset-thumb");
        setUploadedThumbUrl(thumbUrl);
        setUploadingThumb(false);
      }

      if (!fileUrl) { toast.error("Завантажте файл принту"); setSaving(false); return; }
      if (!thumbUrl) { thumbUrl = fileUrl; } // use file as thumb if no thumb

      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        thumbnail_url: thumbUrl,
        file_url: fileUrl,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        sort_order: form.sort_order,
        is_active: form.is_active,
      };

      const supabase = createClient();
      if (editing) {
        const { error } = await supabase.from("print_presets").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Принт оновлено");
      } else {
        const { error } = await supabase.from("print_presets").insert(payload);
        if (error) throw error;
        toast.success("Принт додано");
      }

      setModalOpen(false);
      fetchPresets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
      setUploadingFile(false);
      setUploadingThumb(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("print_presets").delete().eq("id", deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Видалено");
    setDeleteTarget(null);
    fetchPresets();
  };

  const handleToggle = async (p: PrintPreset) => {
    const supabase = createClient();
    const { error } = await supabase.from("print_presets").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setPresets((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (!tableExists) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
        <AlertCircle className="size-8 text-amber-500" />
        <div>
          <p className="font-semibold text-sm mb-1">Таблиця print_presets не існує</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Виконайте SQL-міграцію в Supabase, щоб створити таблицю, потім оновіть сторінку.
          </p>
        </div>
        <pre className="text-left text-[10px] bg-muted rounded-xl p-4 max-w-lg overflow-x-auto border border-border">
{`create table public.print_presets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null default '',
  thumbnail_url text not null,
  file_url      text not null,
  tags          text[] not null default '{}',
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table public.print_presets enable row level security;
create policy "Public read" on public.print_presets
  for select using (is_active = true);
create policy "Admins manage" on public.print_presets
  for all using (auth.role() = 'authenticated');`}
        </pre>
        <Button size="sm" onClick={fetchPresets} variant="outline">
          <RefreshCw className="size-3.5 mr-1.5" /> Перевірити знову
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Готові принти</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ілюстрації, доступні клієнтам у редакторі</p>
        </div>
        {showHeaderAction && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-3.5 mr-1.5" /> Додати принт
          </Button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border-2 border-dashed border-border rounded-xl">
          <Upload className="size-8 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">Принтів ще немає</p>
            <p className="text-xs text-muted-foreground mt-0.5">Додайте перший принт, щоб він з'явився у редакторі</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-3.5 mr-1.5" /> Додати принт
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {presets.map((p) => (
            <div key={p.id} className={`group relative rounded-xl border overflow-hidden bg-muted transition-all ${p.is_active ? "border-border" : "border-border/40 opacity-50"}`}>
              {/* Thumbnail */}
              <div className="aspect-square bg-muted/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium truncate">{p.name}</p>
                {p.category && <p className="text-[10px] text-muted-foreground truncate">{p.category}</p>}
                {p.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted-foreground/10 text-muted-foreground">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => openEdit(p)}
                  className="size-7 flex items-center justify-center rounded-lg bg-background/90 border border-border shadow-sm hover:bg-muted transition-colors">
                  <Pencil className="size-3.5" />
                </button>
                <button type="button" onClick={() => setDeleteTarget(p)}
                  className="size-7 flex items-center justify-center rounded-lg bg-background/90 border border-border shadow-sm hover:bg-destructive/10 text-destructive transition-colors">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Active toggle */}
              <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Switch checked={p.is_active} onCheckedChange={() => handleToggle(p)} className="scale-75" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Редагувати принт" : "Новий принт"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="preset-name">Назва *</Label>
              <Input id="preset-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="напр. Корпоративний герб" />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="preset-cat">Категорія</Label>
              <Input id="preset-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="напр. IT, HoReCa, Корпоратив" />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="preset-tags" className="flex items-center gap-1.5">
                <Tag className="size-3.5" /> Теги (через кому)
              </Label>
              <Input id="preset-tags" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="напр. корпоратив, ювілей, IT" />
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <Label>Файл принту (PNG/SVG/PDF) *</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-6 ${filePreview ? "border-primary/40 bg-primary/5" : "border-border hover:border-foreground/30 bg-muted/30"}`}
              >
                {filePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={filePreview} alt="preview" className="max-h-24 max-w-full object-contain rounded-lg" />
                    <p className="text-[10px] text-muted-foreground">{fileFile?.name ?? "Поточний файл"}</p>
                  </>
                ) : (
                  <>
                    <Upload className="size-6 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">Натисніть або перетягніть файл</p>
                    <p className="text-[10px] text-muted-foreground/60">PNG, SVG, PDF · макс. 20 МБ</p>
                  </>
                )}
                {uploadingFile && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
                    <RefreshCw className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".png,.svg,.pdf,image/png,image/svg+xml,application/pdf"
                className="hidden" onChange={(e) => handleFileSelect(e, "file")} />
            </div>

            {/* Thumbnail upload */}
            <div className="space-y-1.5">
              <Label>Мініатюра (необов'язково — якщо не вказано, використовується файл)</Label>
              <div
                onClick={() => thumbInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-4 ${thumbPreview ? "border-primary/40 bg-primary/5" : "border-border hover:border-foreground/30 bg-muted/30"}`}
              >
                {thumbPreview ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbPreview} alt="thumb" className="size-16 object-cover rounded-lg border border-border" />
                    <div>
                      <p className="text-xs font-medium">Мініатюра завантажена</p>
                      <p className="text-[10px] text-muted-foreground">Натисніть, щоб замінити</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="size-5 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">Завантажити мініатюру (JPG/PNG)</p>
                  </>
                )}
                {uploadingThumb && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
                    <RefreshCw className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input ref={thumbInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFileSelect(e, "thumb")} />
            </div>

            {/* Sort order + Active */}
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="preset-sort">Порядок сортування</Label>
                <Input id="preset-sort" type="number" value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_active}
                  onCheckedChange={(v: boolean) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label>Активний</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={saving || uploadingFile || uploadingThumb}>
              {(saving || uploadingFile || uploadingThumb) && <RefreshCw className="size-3.5 mr-1.5 animate-spin" />}
              {editing ? "Зберегти" : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити принт?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.name}» буде видалено назавжди. Файли в Storage залишаться.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
