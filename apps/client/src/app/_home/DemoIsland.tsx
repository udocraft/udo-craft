"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Upload, X } from "lucide-react";
import { Button } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";

export interface DemoVariant {
  id: string;
  name: string;
  hex: string;
  image: string;
}

interface DemoLabels {
  color: string;
  upload: string;
  remove: string;
  hint: string;
  note: string;
  tooLarge: string;
  editor: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Live demo island: pick a colour, drop a logo on the product, see the price.
 * Preview only, nothing is uploaded. The full editor lives on /order.
 */
export function DemoIsland({
  variants,
  fallbackImage,
  productName,
  priceLabel,
  orderHref,
  labels,
  children,
}: {
  variants: DemoVariant[];
  fallbackImage: string | null;
  productName: string | null;
  priceLabel: string | null;
  orderHref: string;
  labels: DemoLabels;
  children?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [logo, setLogo] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (logo) URL.revokeObjectURL(logo.url); }, [logo]);

  const image = variants[active]?.image ?? fallbackImage;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(true);
      return;
    }
    setError(false);
    setLogo({ url: URL.createObjectURL(file), name: file.name });
  };

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div className="order-2 lg:order-1">
        {productName && <p className="text-h3 font-semibold">{productName}</p>}
        {priceLabel && <p className="mt-1 text-muted-foreground">{priceLabel}</p>}

        {variants.length > 1 && (
          <div className="mt-8">
            <p className="text-sm font-medium" id="demo-color-label">{labels.color}</p>
            <div className="mt-2 flex flex-wrap gap-1" role="group" aria-labelledby="demo-color-label">
              {variants.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  aria-label={v.name}
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                  className="flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={`size-7 rounded-full border border-border transition-shadow duration-fast ${i === active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: v.hex }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
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
          <div className="flex flex-wrap items-center gap-3">
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

        <div className="mt-8">
          <Button asChild variant="primary" size="lg">
            <Link href={orderHref}>
              {labels.editor} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">{labels.note}</p>
        </div>

        {children}
      </div>

      <div className="order-1 lg:order-2">
        <div className="relative mx-auto aspect-square w-full max-w-[34rem] overflow-hidden rounded-media bg-white ring-1 ring-foreground/10">
          {image && (
            <img
              src={image}
              alt={productName ?? ""}
              width={1088}
              height={1088}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-contain p-6 sm:p-10"
            />
          )}
          {logo && (
            <img
              src={logo.url}
              alt={logo.name}
              className="absolute left-1/2 top-[30%] max-h-[22%] w-[26%] -translate-x-1/2 object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
