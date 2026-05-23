"use client";

import { useState } from "react";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { AdminCardGrid, AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const DEFAULT_PRINT_TYPES = [
  { id: "dtf",         label: "DTF / Принт",   color: "#6366f1", desc: "Прямий друк", is_active: true },
  { id: "embroidery",  label: "Вишивка",        color: "#ec4899", desc: "Машинна вишивка", is_active: true },
  { id: "screen",      label: "Шовкодрук",      color: "#f59e0b", desc: "Шовкодрук", is_active: true },
  { id: "sublimation", label: "Сублімація",     color: "#06b6d4", desc: "Сублімація", is_active: true },
  { id: "patch",       label: "Нашивка",        color: "#10b981", desc: "Тканинна нашивка", is_active: true },
];

const DISCOUNT_TIERS = [
  { min: 1,   max: 9,        pct: 0  },
  { min: 10,  max: 49,       pct: 5  },
  { min: 50,  max: 99,       pct: 12 },
  { min: 100, max: Infinity, pct: 15 },
];

type PrintType = typeof DEFAULT_PRINT_TYPES[number] & { is_active: boolean };

export default function PrintTypesTab() {
  const [printTypes, setPrintTypes] = useState<PrintType[]>(DEFAULT_PRINT_TYPES);
  const [editingType, setEditingType] = useState<PrintType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleToggle = (id: string) =>
    setPrintTypes(prev => prev.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t));

  const handleSave = (updated: PrintType) => {
    setPrintTypes(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditDialogOpen(false);
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <AdminSection title="Типи друку" description="Керування доступними типами друку">
        <AdminCardGrid className="xl:grid-cols-2">
          {printTypes.map(type => (
            <Card key={type.id} className={!type.is_active ? "opacity-50" : ""}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ background: type.color }} />
                      <p className="font-medium text-sm">{type.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(type.id)}>
                      {type.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingType(type); setEditDialogOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </AdminCardGrid>
      </AdminSection>

      <AdminSection title="Таблиця знижок" description="Знижки за кількість замовлених одиниць">
        <AdminTablePanel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Кількість</TableHead>
              <TableHead>Знижка</TableHead>
              <TableHead>Приклад (від 100 ₴)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DISCOUNT_TIERS.map((tier, i) => (
              <TableRow key={i} className="hover:bg-muted/40">
                <TableCell className="text-sm font-medium">
                  {tier.min}–{tier.max === Infinity ? "∞" : tier.max} шт
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center justify-center w-14 h-6 rounded text-sm font-semibold ${tier.pct > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {tier.pct}%
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {tier.pct > 0 ? (
                    <><span className="line-through">100 ₴</span><span className="ml-2 font-medium text-foreground">{100 - tier.pct} ₴</span></>
                  ) : "100 ₴"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </AdminTablePanel>
      </AdminSection>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Редагувати тип друку</DialogTitle></DialogHeader>
          {editingType && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Назва</Label>
                <Input value={editingType.label} onChange={e => setEditingType({ ...editingType, label: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Опис</Label>
                <Input value={editingType.desc} onChange={e => setEditingType({ ...editingType, desc: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Колір</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={editingType.color} onChange={e => setEditingType({ ...editingType, color: e.target.value })}
                    className="w-10 h-8 rounded border border-border cursor-pointer p-0.5" />
                  <Input value={editingType.color} onChange={e => setEditingType({ ...editingType, color: e.target.value })} className="h-8 text-xs font-mono" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Скасувати</Button>
            <Button onClick={() => editingType && handleSave(editingType)}>Зберегти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
