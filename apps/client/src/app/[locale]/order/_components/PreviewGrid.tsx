"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PrintLayer, PrintZone } from "@udo-craft/shared";
import { useTranslations } from "next-intl";

// Mockups are captured from a 520px fabric canvas, so zone coordinates share that space.
const CANVAS_SIZE = 520;

const KNOWN_SIDES = ["front", "back", "chest", "neck_inner", "sleeve_left", "sleeve_right"];

interface PreviewGridProps {
  mockups: Record<string, string>;
  layers: PrintLayer[];
  printZones: Record<string, PrintZone | null | undefined>;
  productImages: Record<string, string>;
  productName: string;
  colorName?: string;
  onBackToDesign: () => void;
}

type TileKind = "plain" | "zone" | "collar" | "flat";
interface Tile {
  id: string;
  label: string;
  hint: string;
  src: string;
  kind: TileKind;
  origin?: string;
  zoom?: number;
}

function TileImage({ tile, alt }: { tile: Tile; alt: string }) {
  if (tile.kind === "flat") {
    return (
      <div className="relative size-full overflow-hidden" style={{ background: "radial-gradient(circle at 30% 20%, #efe7d8, #ddd2bd)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tile.src}
          alt={alt}
          className="absolute inset-[10%] size-[80%] object-contain"
          style={{ transform: "rotate(-4deg)", filter: "drop-shadow(0 14px 14px rgba(60,40,10,0.28))" }}
        />
      </div>
    );
  }
  const zoomed = tile.kind === "zone" || tile.kind === "collar";
  return (
    <div className="size-full overflow-hidden bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tile.src}
        alt={alt}
        className="size-full object-cover"
        style={zoomed ? { transform: `scale(${tile.zoom ?? 2})`, transformOrigin: tile.origin ?? "50% 50%" } : undefined}
      />
    </div>
  );
}

function Lightbox({ tiles, index, onIndex, onClose, productName }: {
  tiles: Tile[]; index: number; onIndex: (i: number) => void; onClose: () => void; productName: string;
}) {
  const t = useTranslations("editor.preview");
  const ref = useRef<HTMLDivElement>(null);
  const tile = tiles[index];
  const prev = useCallback(() => onIndex((index - 1 + tiles.length) % tiles.length), [index, tiles.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % tiles.length), [index, tiles.length, onIndex]);

  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => origin?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "Tab" && ref.current) {
        const items = Array.from(ref.current.querySelectorAll<HTMLElement>("button"));
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, prev, next]);

  const navBtn = "flex size-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`${productName}: ${tile.label}`}
      className="fixed inset-0 z-[10020] flex flex-col bg-black/85 p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="flex items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium">{tile.label} <span className="ml-2 text-white/60">{index + 1} / {tiles.length}</span></p>
        <button type="button" onClick={onClose} aria-label={t("close")} className={navBtn}><X className="size-5" /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-6">
        <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label={t("prev")} className={navBtn}><ChevronLeft className="size-6" /></button>
        <div
          className="aspect-square max-h-full w-full max-w-[min(100%,720px)] overflow-hidden rounded-lg"
          onClick={(e) => e.stopPropagation()}
          aria-live="polite"
        >
          <TileImage tile={tile} alt={`${productName}, ${tile.label}`} />
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} aria-label={t("next")} className={navBtn}><ChevronRight className="size-6" /></button>
      </div>
      <div className="flex flex-wrap justify-center gap-x-1 gap-y-0" onClick={(e) => e.stopPropagation()}>
        {tiles.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onIndex(i)}
            aria-current={i === index}
            className={`h-11 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${i === index ? "text-white underline underline-offset-8" : "text-white/60 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

export function PreviewGrid({ mockups, layers, printZones, productImages, productName, colorName, onBackToDesign }: PreviewGridProps) {
  const t = useTranslations("editor.preview");
  const [open, setOpen] = useState<number | null>(null);

  const tiles = useMemo<Tile[]>(() => {
    const out: Tile[] = [];
    // Every side the product shows, front and back first, then the rest in image order.
    const sides = Array.from(new Set([
      ...["front", "back"].filter((k) => productImages[k] || mockups[k]),
      ...Object.keys(productImages),
      ...Object.keys(mockups),
    ]));
    const printed = new Set(layers.map((l) => l.side));
    // The first printed side gets the close-up crops.
    const hero = sides.find((k) => printed.has(k) && mockups[k]);

    for (const side of sides) {
      const isPrinted = printed.has(side);
      const src = isPrinted ? (mockups[side] || productImages[side] || "") : (productImages[side] || "");
      if (!src) continue;
      out.push({ id: side, label: KNOWN_SIDES.includes(side) ? t(`sides.${side}`) : side, hint: isPrinted ? t("withPrint") : t("noPrint"), src, kind: "plain" });
    }
    // Printed sides first so the large tile shows the user's design.
    out.sort((a, b) => Number(printed.has(b.id)) - Number(printed.has(a.id)));

    // Zoomed crops only when the mockup is a real render of the user's print.
    if (hero) {
      const z = (printZones as Record<string, PrintZone | null | undefined>)[hero];
      if (z && z.width > 0 && z.height > 0) {
        const cx = ((z.x + z.width / 2) / CANVAS_SIZE) * 100;
        const cy = ((z.y + z.height / 2) / CANVAS_SIZE) * 100;
        const zoom = Math.min(3.2, Math.max(1.5, (CANVAS_SIZE / Math.max(z.width, z.height)) * 0.8));
        out.push({ id: "zone", label: t("tiles.zone"), hint: t("tiles.zoneHint"), src: mockups[hero], kind: "zone", origin: `${cx}% ${cy}%`, zoom });
      }
      out.push({ id: "collar", label: t("tiles.collar"), hint: t("tiles.collarHint"), src: mockups[hero], kind: "collar", origin: "50% 8%", zoom: 2.4 });
      out.push({ id: "flat", label: t("tiles.flat"), hint: t("tiles.flatHint"), src: mockups[hero], kind: "flat" });
    }
    return out.slice(0, 7);
  }, [mockups, layers, printZones, productImages, t]);

  if (layers.length === 0 || tiles.length === 0) {
    return (
      <div className="flex min-h-[320px] w-full max-w-md flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-base font-semibold">{t("emptyTitle")}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("emptyBody")}
        </p>
        <button
          type="button"
          onClick={onBackToDesign}
          className="mt-2 h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("backToDesign")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-3 text-xs text-muted-foreground">
        {productName}{colorName ? `, ${colorName}` : ""}. {t("readOnly")}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile, i) => (
          <li key={tile.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full text-left focus-visible:outline-none"
            >
              <span className="block aspect-square overflow-hidden rounded-lg border border-border transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
                <TileImage tile={tile} alt={`${productName}, ${tile.label}`} />
              </span>
              <span className="mt-1.5 flex min-h-[28px] items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">{tile.label}</span>
                <span className="truncate text-muted-foreground">{tile.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <Lightbox tiles={tiles} index={open} onIndex={setOpen} onClose={() => setOpen(null)} productName={productName} />
      )}
    </div>
  );
}
