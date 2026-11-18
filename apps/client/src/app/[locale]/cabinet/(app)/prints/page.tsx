"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileImage, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CabinetPage } from "../_components/CabinetPage";

interface PrintFile {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: "uploaded" | "approved" | "rejected";
  created_at: string;
  url: string | null;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PrintsPage() {
  const t = useTranslations("cabinet.prints");
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/prints", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { files: PrintFile[] };
      setFiles(data.files);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadFiles = async (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (!picked.length) return;
    setUploading(true);
    for (const file of picked) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/cabinet/prints", { method: "POST", body: form });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(`${file.name}: ${body.error ?? t("uploadError")}`);
        }
      } catch {
        toast.error(`${file.name}: ${t("uploadError")}`);
      }
    }
    setUploading(false);
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cabinet/prints/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <CabinetPage title={t("title")} subtitle={t("subtitle")}>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading) uploadFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card p-8 text-center transition-colors",
            dragOver && "border-primary bg-primary/5",
          )}
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">{t("dropHint")}</p>
          <p className="text-xs text-muted-foreground">{t("formats")}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            aria-label={t("pickFiles")}
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
            {uploading ? t("uploading") : t("pickFiles")}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {files.map((f) => (
              <li key={f.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex aspect-square items-center justify-center bg-muted/40">
                  {f.url && f.mime_type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.file_name} className="size-full object-contain" loading="lazy" />
                  ) : (
                    <FileImage className="size-8 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="flex items-center gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium" title={f.file_name}>{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(f.size_bytes)} · {t(`status.${f.status}`)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    disabled={deletingId === f.id}
                    aria-label={t("delete")}
                    className="hit-44 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {deletingId === f.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CabinetPage>
  );
}
