"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Upload, X } from "lucide-react";
import { Button } from "@udo-craft/ui";
import { useRouter } from "@/i18n/navigation";
import { saveHandoffFile } from "@/lib/upload-handoff";

export interface DemoVariant {
  id: string;
  name: string;
  hex: string;
  image: string;
}

export interface DemoItem {
  id: string;
  slug: string;
  name: string;
  priceLabel: string | null;
  variants: DemoVariant[];
  fallbackImage: string | null;
}

interface DemoLabels {
  color: string;
  upload: string;
  remove: string;
  hint: string;
  note: string;
  tooLarge: string;
  editor: string;
  prev: string;
  next: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * «Спробуй наші бестселери»: cycle through bestseller products with chevrons, pick a
 * colour, drop an image on the product. The button opens the builder on /order with
 * that product, colour and image already in place (the file is handed over through
 * this browser's IndexedDB, nothing is uploaded before checkout).
 */
export function DemoIsland({ items, labels }: { items: DemoItem[]; labels: DemoLabels }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [logo, setLogo] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (logo) URL.revokeObjectURL(logo.url); }, [logo]);

  if (items.length === 0) return null;
  const item = items[index];
  const variant = item.variants[colorIdx] ?? item.variants[0];
  const image = variant?.image ?? item.fallbackImage;
  const many = items.length > 1;

  const go = (delta: number) => {
    setIndex((i) => (i + delta + items.length) % items.length);
    setColorIdx(0);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(true);
      return;
    }
    setError(false);
    setLogo({ url: URL.createObjectURL(file), file });
  };

  const openEditor = async () => {
    const params = new URLSearchParams({ product: item.slug });
    if (variant) params.set("variant", variant.id);
    if (logo) {
      setOpening(true);
      const id = await saveHandoffFile(logo.file);
      if (id) params.set("upload", id);
    }
    router.push(`/order?${params.toString()}`);
  };

  return (
    <div className="mx-auto flex max-w-[40rem] flex-col items-center text-center">
      {/* Preview with chevrons on both sides */}
      <div className="flex w-full items-center justify-center gap-3 sm:gap-5">
        {many && (
          <Button variant="outline" size="icon" aria-label={labels.prev} aria-controls="demo-preview" onClick={() => go(-1)} className="shrink-0">
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <div
          id="demo-preview"
          aria-live="polite"
          className="relative aspect-square w-full max-w-[30rem] overflow-hidden rounded-media bg-white ring-1 ring-foreground/10"
        >
          {image && (
            <Image
              key={image}
              src={image}
              alt={item.name}
              fill
              sizes="(min-width: 640px) 30rem, 70vw"
              className="object-contain p-6 sm:p-10 animate-in fade-in duration-300"
            />
          )}
          {logo && (
            // blob: preview of the visitor's own file; next/image cannot optimise it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.url}
              alt={logo.file.name}
              className="absolute left-1/2 top-[30%] max-h-[22%] w-[26%] -translate-x-1/2 object-contain"
            />
          )}
        </div>
        {many && (
          <Button variant="outline" size="icon" aria-label={labels.next} aria-controls="demo-preview" onClick={() => go(1)} className="shrink-0">
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </div>

      {many && (
        <p className="mt-4 text-sm tabular-nums text-muted-foreground" aria-hidden="true">
          {index + 1} / {items.length}
        </p>
      )}

      <p className="mt-6 text-h3 font-semibold">{item.name}</p>
      {item.priceLabel && <p className="mt-1 text-muted-foreground">{item.priceLabel}</p>}

      {item.variants.length > 1 && (
        <div className="mt-6">
          <p className="text-sm font-medium" id="demo-color-label">{labels.color}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1" role="group" aria-labelledby="demo-color-label">
            {item.variants.map((v, i) => (
              <button
                key={v.id}
                type="button"
                aria-label={v.name}
                aria-pressed={i === colorIdx}
                onClick={() => setColorIdx(i)}
                className="flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`size-7 rounded-full border border-border transition-shadow duration-fast ${i === colorIdx ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                  style={{ backgroundColor: v.hex }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden="true" /> {labels.upload}
          </Button>
          {logo && (
            <Button type="button" variant="ghost" onClick={() => setLogo(null)}>
              <X aria-hidden="true" /> {labels.remove}
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{labels.hint}</p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {labels.tooLarge}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center">
        <Button type="button" variant="primary" size="lg" onClick={openEditor} disabled={opening}>
          {labels.editor} {opening ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Button>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{labels.note}</p>
      </div>
    </div>
  );
}
