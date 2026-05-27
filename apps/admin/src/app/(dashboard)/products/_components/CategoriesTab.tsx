"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical, Check, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import { CategoryDialog } from "./CategoryDialog";
import type { Category } from "@udo-craft/shared";

export interface CategoriesTabProps {
  categories: Category[];
  onRefresh: () => void;
  loading?: boolean;
  onCreateActionReady?: (handler: () => void) => void;
  showSectionAction?: boolean;
}

interface EditDraft { name: string; slug: string; }

export function CategoriesTab({
  categories: propCategories,
  onRefresh,
  loading = false,
  onCreateActionReady,
  showSectionAction = true,
}: CategoriesTabProps) {
  const [categories, setCategories] = useState<Category[]>(propCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  // Inline edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ name: "", slug: "" });
  const [savingInline, setSavingInline] = useState(false);
  // Drag
  const dragItem = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => { setCategories(propCategories); }, [propCategories]);

  const openCreate = () => {
    setEditingCategory(undefined);
    setDialogOpen(true);
  };

  useEffect(() => {
    onCreateActionReady?.(openCreate);
  }, [onCreateActionReady]);

  // ── Inline edit ────────────────────────────────────────────────────────────

  const startInlineEdit = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEditId(cat.id);
    setDraft({ name: cat.name, slug: cat.slug });
  };

  const cancelInlineEdit = () => { setInlineEditId(null); };

  const saveInlineEdit = async (cat: Category) => {
    if (!draft.name.trim()) return;
    setSavingInline(true);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name.trim(), slug: draft.slug.trim() }),
      });
      if (!res.ok) throw new Error();
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: draft.name.trim(), slug: draft.slug.trim() } : c));
      setInlineEditId(null);
      toast.success("Збережено");
    } catch { toast.error("Помилка збереження"); }
    finally { setSavingInline(false); }
  };

  // ── Toggle ─────────────────────────────────────────────────────────────────

  const handleToggle = async (cat: Category) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      if (!res.ok) throw new Error();
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
    } catch { toast.error("Помилка"); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Категорію видалено");
      onRefresh();
    } catch { toast.error("Помилка видалення"); }
    finally { setDeleteTarget(null); }
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const reorder = (items: Category[], fromId: string, toId: string): Category[] => {
    const from = items.findIndex(i => i.id === fromId);
    const to = items.findIndex(i => i.id === toId);
    if (from === -1 || to === -1 || from === to) return items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const persistOrder = (items: Category[]) =>
    Promise.all(items.map((cat, i) =>
      fetch(`/api/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: i }),
      })
    ));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 p-4 md:p-6">
      <AdminSection
        title="Категорії"
        description="Групи товарів для навігації та фільтрації"
        actions={showSectionAction ? <Button size="sm" onClick={openCreate}>Нова категорія</Button> : undefined}
      >

      {loading ? (
        <AdminTablePanel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-6" /><TableHead className="w-10" /><TableHead className="w-10" />
              <TableHead>Назва</TableHead><TableHead>Slug</TableHead><TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {[4, 8, 8, 40, 24, 8].map((w, j) => (
                  <TableCell key={j}><div className={`h-4 w-${w} bg-muted rounded animate-pulse`} /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </AdminTablePanel>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Категорій ще немає"
          description="Створіть першу категорію для організації товарів"
          action={<Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5 mr-1" /> Нова категорія</Button>}
        />
      ) : (
        <AdminTablePanel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-6"><span className="sr-only">Перетягнути</span></TableHead>
              <TableHead className="w-10"><span className="sr-only">Активна</span></TableHead>
              <TableHead className="w-10"><span className="sr-only">Фото</span></TableHead>
              <TableHead>Назва</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-24"><span className="sr-only">Дії</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(cat => {
              const isEditing = inlineEditId === cat.id;
              return (
                <TableRow
                  key={cat.id}
                  draggable={!isEditing}
                  onDragStart={() => { dragItem.current = cat.id; }}
                  onDragOver={e => { e.preventDefault(); setDragOverId(cat.id); }}
                  onDragLeave={() => { if (dragOverId === cat.id) setDragOverId(null); }}
                  onDragEnd={() => { setDragOverId(null); /* do NOT clear dragItem here */ }}
                  onDrop={e => {
                    e.preventDefault();
                    const fromId = dragItem.current;
                    dragItem.current = null;
                    setDragOverId(null);
                    if (fromId && fromId !== cat.id) {
                      const next = reorder(categories, fromId, cat.id);
                      setCategories(next);
                      persistOrder(next);
                    }
                  }}
                  className={`group hover:bg-muted/40 ${!isEditing ? "cursor-move" : ""} ${dragOverId === cat.id ? "bg-primary/5 border-t-2 border-t-primary" : ""}`}
                >
                  {/* Drag handle */}
                  <TableCell className="text-muted-foreground cursor-grab active:cursor-grabbing pr-0">
                    <GripVertical className="w-4 h-4" />
                  </TableCell>

                  {/* Active toggle */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Switch checked={cat.is_active} onCheckedChange={() => handleToggle(cat)} />
                  </TableCell>

                  {/* Image */}
                  <TableCell>
                    {cat.image_url
                      ? <img src={cat.image_url} alt={cat.name} className="w-7 h-7 rounded object-contain bg-muted" />
                      : <div className="w-7 h-7 rounded bg-muted" />
                    }
                  </TableCell>

                  {/* Name — view or inline edit */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={draft.name}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(cat); if (e.key === "Escape") cancelInlineEdit(); }}
                        className="text-sm w-full max-w-[200px]"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="font-medium text-sm">{cat.name}</span>
                    )}
                  </TableCell>

                  {/* Slug — view or inline edit */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={draft.slug}
                        onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(cat); if (e.key === "Escape") cancelInlineEdit(); }}
                        className="text-xs font-mono w-full max-w-[160px]"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">/{cat.slug}</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => saveInlineEdit(cat)} disabled={savingInline}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground"
                          onClick={cancelInlineEdit}>
                          <XIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon"
                          onClick={e => startInlineEdit(cat, e)} title="Редагувати">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(cat)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </AdminTablePanel>
      )}
      </AdminSection>

      {/* Full edit dialog (for image, sort_order etc) */}
      <CategoryDialog
        key={editingCategory?.id ?? "new"}
        category={editingCategory}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCategory(undefined); }}
        onSaved={() => { onRefresh(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити категорію?</AlertDialogTitle>
            <AlertDialogDescription>
              Категорія «{deleteTarget?.name}» буде видалена. Товари залишаться без категорії.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
