"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PRINT_ZONE_SIDES, type PrintZone, type ProductImage } from "@udo-craft/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Zone coordinates are stored in the storefront canvas space: a 520x520 square,
// product image fitted (contain) to its top-left corner. See ProductCanvas.tsx CANVAS_SIZE.
const SPACE = 520;
const MIN = 20;

const SIDE_LABELS: Record<string, string> = {
  front: "Перед",
  back: "Зад",
  neck_inner: "Внутрішня бірка",
  sleeve_left: "Лівий рукав",
  sleeve_right: "Правий рукав",
};

interface PrintAreaOption { id: string; name: string; label: string; width_mm?: number; height_mm?: number }

interface Draft {
  id?: string;
  x: number; y: number; width: number; height: number;
  label: string;
  width_mm: string; height_mm: string;
  print_area_id: string;
  dirty: boolean;
}

interface Props {
  productId: string;
  images: ProductImage[];
  printAreas: PrintAreaOption[];
  pxToMmRatio?: number;
}

type Handle = "move" | "nw" | "ne" | "sw" | "se";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function fromZone(z: PrintZone): Draft {
  return {
    id: z.id, x: z.x, y: z.y, width: z.width, height: z.height,
    label: z.label ?? "",
    width_mm: z.width_mm != null ? String(z.width_mm) : "",
    height_mm: z.height_mm != null ? String(z.height_mm) : "",
    print_area_id: z.print_area_id ?? "",
    dirty: false,
  };
}

export function PrintZonesEditor({ productId, images, printAreas, pxToMmRatio }: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [side, setSide] = useState<string>("front");
  const [extraSides, setExtraSides] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; px: number; py: number; start: Draft } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/print-zones?product_id=${productId}`);
      const zones: PrintZone[] = res.ok ? await res.json() : [];
      const next: Record<string, Draft> = {};
      zones.forEach((z) => { next[z.side] = fromZone(z); });
      setDrafts(next);
      const first = ["front", "back", ...Object.keys(next)].find((s) => next[s]);
      if (first) setSide(first);
    } catch {
      toast.error("Не вдалося завантажити зони друку");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const imageByKey = useMemo(() => {
    const m: Record<string, ProductImage> = {};
    images.forEach((i) => { if (i.url) m[i.key] = i; });
    return m;
  }, [images]);

  // Sides offered as pills: known sides that have an image, any side with a zone, plus manually added ones.
  const sides = useMemo(() => {
    const set = new Set<string>();
    PRINT_ZONE_SIDES.forEach((s) => { if (imageByKey[s]) set.add(s); });
    Object.keys(drafts).forEach((s) => set.add(s));
    extraSides.forEach((s) => set.add(s));
    return Array.from(set);
  }, [imageByKey, drafts, extraSides]);

  const addable = PRINT_ZONE_SIDES.filter((s) => !sides.includes(s));
  const draft = drafts[side];
  const imageUrl = (imageByKey[side] ?? imageByKey.front ?? Object.values(imageByKey)[0])?.url;

  const patch = (p: Partial<Draft>) =>
    setDrafts((d) => (d[side] ? { ...d, [side]: { ...d[side], ...p, dirty: true } } : d));

  const setBox = (b: Pick<Draft, "x" | "y" | "width" | "height">) => {
    const width = clamp(Math.round(b.width), MIN, SPACE);
    const height = clamp(Math.round(b.height), MIN, SPACE);
    patch({ width, height, x: clamp(Math.round(b.x), 0, SPACE - width), y: clamp(Math.round(b.y), 0, SPACE - height) });
  };

  const createZone = () => {
    const w = 200, h = 240;
    setDrafts((d) => ({
      ...d,
      [side]: { x: (SPACE - w) / 2, y: 120, width: w, height: h, label: "", width_mm: "", height_mm: "", print_area_id: "", dirty: true },
    }));
  };

  // ── Pointer drag / resize ──────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent, handle: Handle) => {
    if (!draft) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { handle, px: e.clientX, py: e.clientY, start: draft };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const box = boxRef.current;
    if (!d || !box) return;
    const k = SPACE / box.getBoundingClientRect().width;
    const dx = (e.clientX - d.px) * k;
    const dy = (e.clientY - d.py) * k;
    const { x, y, width, height } = d.start;
    if (d.handle === "move") return setBox({ x: x + dx, y: y + dy, width, height });
    let nx = x, ny = y, nw = width, nh = height;
    if (d.handle.includes("e")) nw = width + dx;
    if (d.handle.includes("w")) { nw = width - dx; nx = x + dx; }
    if (d.handle.includes("s")) nh = height + dy;
    if (d.handle.includes("n")) { nh = height - dy; ny = y + dy; }
    if (nw < MIN) { if (d.handle.includes("w")) nx = x + width - MIN; nw = MIN; }
    if (nh < MIN) { if (d.handle.includes("n")) ny = y + height - MIN; nh = MIN; }
    setBox({ x: nx, y: ny, width: nw, height: nh });
  };

  const endDrag = () => { dragRef.current = null; };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!draft || !e.key.startsWith("Arrow")) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    // Alt + arrows resizes, plain arrows move
    if (e.altKey) setBox({ ...draft, width: draft.width + dx, height: draft.height + dy });
    else setBox({ ...draft, x: draft.x + dx, y: draft.y + dy });
  };

  const onPickArea = (id: string | null) => {
    if (!id) return;
    const area = printAreas.find((a) => a.id === id);
    patch({
      print_area_id: id === "none" ? "" : id,
      ...(area && !draft?.width_mm ? { width_mm: String(area.width_mm ?? ""), height_mm: String(area.height_mm ?? "") } : {}),
    });
  };

  // ── Save / delete ──────────────────────────────────────────────────────────
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/print-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId, side,
          x: draft.x, y: draft.y, width: draft.width, height: draft.height,
          label: draft.label,
          sort_order: Math.max(0, sides.indexOf(side)),
          width_mm: draft.width_mm, height_mm: draft.height_mm,
          print_area_id: draft.print_area_id || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Помилка збереження");
      const saved: PrintZone = await res.json();
      setDrafts((d) => ({ ...d, [side]: fromZone(saved) }));
      toast.success("Зону друку збережено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft) return;
    if (draft.id) {
      const res = await fetch("/api/print-zones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id }),
      });
      if (!res.ok) { toast.error("Не вдалося видалити зону"); return; }
      toast.success("Зону видалено");
    }
    setDrafts((d) => { const { [side]: _gone, ...rest } = d; return rest; });
  };

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  const pct = (v: number) => `${(v / SPACE) * 100}%`;
  const numField = (key: "x" | "y" | "width" | "height", label: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" min={0} max={SPACE} value={draft?.[key] ?? 0} disabled={!draft}
        onChange={(e) => setBox({ ...draft!, [key]: Number(e.target.value) || 0 })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sides.map((s) => (
          <button
            key={s} type="button" onClick={() => setSide(s)} aria-pressed={side === s}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              side === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50"
            }`}
          >
            {SIDE_LABELS[s] ?? s}
            {drafts[s] ? <span className="ml-1.5 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" aria-label="зона задана" /> : null}
          </button>
        ))}
        {addable.length > 0 && (
          <Select value="" onValueChange={(s) => { if (!s) return; setExtraSides((a) => [...a, s]); setSide(s); }}>
            <SelectTrigger className="h-8 w-auto gap-1 rounded-full text-xs"><Plus className="size-3" /><SelectValue placeholder="Додати сторону" /></SelectTrigger>
            <SelectContent>{addable.map((s) => <SelectItem key={s} value={s}>{SIDE_LABELS[s] ?? s}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div>
          <div
            ref={boxRef}
            className="relative aspect-square w-full select-none overflow-hidden rounded-xl border border-border bg-muted/40"
            onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" draggable={false} className="absolute inset-0 size-full object-contain object-left-top" />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Для цієї сторони немає фото товару. Додайте зображення у вкладці «Основне».
              </p>
            )}
            {draft && (
              <div
                role="group" tabIndex={0} aria-label="Зона друку. Стрілки переміщують, Alt і стрілки змінюють розмір, Shift кроком 10"
                onKeyDown={onKeyDown} onPointerDown={(e) => onPointerDown(e, "move")}
                className="absolute cursor-move touch-none border-2 border-dashed border-primary bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ left: pct(draft.x), top: pct(draft.y), width: pct(draft.width), height: pct(draft.height) }}
              >
                {(["nw", "ne", "sw", "se"] as const).map((h) => (
                  <span
                    key={h} onPointerDown={(e) => onPointerDown(e, h)}
                    className={`absolute size-3 rounded-sm border border-primary bg-background ${
                      h === "nw" ? "-left-1.5 -top-1.5 cursor-nwse-resize" : h === "ne" ? "-right-1.5 -top-1.5 cursor-nesw-resize"
                      : h === "sw" ? "-bottom-1.5 -left-1.5 cursor-nesw-resize" : "-bottom-1.5 -right-1.5 cursor-nwse-resize"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Координати у просторі 520×520 (як у конструкторі). Перетягніть прямокутник, потягніть за кути або скористайтесь стрілками.
          </p>
        </div>

        <div className="space-y-4">
          {!draft ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Для сторони «{SIDE_LABELS[side] ?? side}» зону друку ще не задано.</p>
              <Button size="sm" onClick={createZone}><Plus className="size-4" />Створити зону</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {numField("x", "X, px")}{numField("y", "Y, px")}{numField("width", "Ширина, px")}{numField("height", "Висота, px")}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Назва на кнопці (необов’язково)</Label>
                <Input value={draft.label} placeholder={SIDE_LABELS[side] ?? side} onChange={(e) => patch({ label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Ширина, мм</Label>
                  <Input type="number" min={0} value={draft.width_mm} onChange={(e) => patch({ width_mm: e.target.value })}
                    placeholder={pxToMmRatio ? String(Math.round(draft.width / pxToMmRatio)) : ""} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Висота, мм</Label>
                  <Input type="number" min={0} value={draft.height_mm} onChange={(e) => patch({ height_mm: e.target.value })}
                    placeholder={pxToMmRatio ? String(Math.round(draft.height / pxToMmRatio)) : ""} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Область друку (ціни та розмір)</Label>
                <Select value={draft.print_area_id || "none"} onValueChange={onPickArea}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не пов’язано</SelectItem>
                    {printAreas.map((a) => <SelectItem key={a.id} value={a.id}>{a.label || a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={saving || !draft.dirty}>
                  {saving && <Loader2 className="size-4 animate-spin" />}Зберегти зону
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={remove}>
                  <Trash2 className="size-4" />Видалити
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
