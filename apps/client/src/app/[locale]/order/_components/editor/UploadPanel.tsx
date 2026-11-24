"use client";

import { useTranslations } from "next-intl";

import React, { useCallback, useRef, useState } from "react";
import { File, FileImage, RefreshCw, Upload, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

export interface UploadPanelProps {
  activeSide: string;
  onFileAdd: (file: File) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/pdf",
] as const;

const ACCEPTED_EXTENSIONS = ".png, .jpg, .jpeg, .svg, .pdf";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_FILE_SIZE_LABEL = "20 MB";

// ── Helpers ───────────────────────────────────────────────────────────────

function isImageMime(mime: string): boolean {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/svg+xml";
}

/** Returns a translation key ("editor.upload.*") with its values, or null when the file is fine. */
function validateFile(file: File): { key: "badType" | "tooLarge"; values: Record<string, string> } | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return { key: "badType", values: { type: file.type || file.name.split(".").pop() || "?" } };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { key: "tooLarge", values: { size: (file.size / 1024 / 1024).toFixed(1), max: MAX_FILE_SIZE_LABEL } };
  }
  return null;
}

// ── Recent file thumbnail ─────────────────────────────────────────────────

function RecentFileThumbnail({
  file,
  objectUrl,
  onClick,
}: {
  file: File;
  objectUrl: string | null;
  onClick: () => void;
}) {
  const t = useTranslations("editor");
  const isImage = isImageMime(file.type);

  return (
    <button
      type="button"
      onClick={onClick}
      title={t("upload.addAgain", { name: file.name })}
      className="group relative flex items-center justify-center rounded-lg border border-border bg-muted aspect-square overflow-hidden hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
    >
      {isImage && objectUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={objectUrl}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 p-2">
          {file.type === "application/pdf" ? (
            <File className="size-6 text-muted-foreground" />
          ) : (
            <FileImage className="size-6 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground text-center leading-tight truncate w-full px-1">
            {file.name.split(".").pop()?.toUpperCase()}
          </span>
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
        {file.name}
      </span>
    </button>
  );
}

// ── Global persistence across visitor session ───────────────────────────────

const globalRecentFiles: File[] = [];
const globalObjectUrls = new Map<File, string>();

// ── Main component ────────────────────────────────────────────────────────

export default function UploadPanel({ onFileAdd }: UploadPanelProps) {
  const t = useTranslations("editor");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recentFiles, setRecentFiles] = useState<File[]>(globalRecentFiles);
  const [objectUrls, setObjectUrls] = useState<Map<File, string>>(globalObjectUrls);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [retryFile, setRetryFile] = useState<File | null>(null);

  // ── Upload logic ──────────────────────────────────────────────────────

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setRetryFile(null);

      const validationError = validateFile(file);
      if (validationError) {
        setError(t(`upload.${validationError.key}`, validationError.values));
        return;
      }

      setUploading(true);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        onFileAdd(file);

        setRecentFiles((prev) => {
          const isDuplicate = prev.some(
            (f) => f.name === file.name && f.size === file.size
          );
          if (isDuplicate) return prev;
          const next = [file, ...prev];
          globalRecentFiles.length = 0;
          globalRecentFiles.push(...next);
          return next;
        });

        if (isImageMime(file.type)) {
          const url = URL.createObjectURL(file);
          setObjectUrls((prev) => {
            const next = new Map(prev).set(file, url);
            globalObjectUrls.set(file, url);
            return next;
          });
        }
      } catch {
        setError(t("upload.addFailed", { name: file.name }));
        setRetryFile(file);
      } finally {
        setUploading(false);
      }
    },
    [onFileAdd]
  );

  // ── File input handler ────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  // ── Drag-and-drop handlers ────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ── Retry handler ─────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (retryFile) processFile(retryFile);
  }, [retryFile, processFile]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Upload zone section ── */}
      <section className="px-3 pt-3 pb-4 border-b border-border space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("upload.title")}
        </h3>

        {/* Drag-and-drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-all",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/40 hover:border-foreground/30",
            uploading ? "pointer-events-none opacity-60" : "cursor-pointer",
          ].join(" ")}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={uploading ? -1 : 0}
          aria-label={t("upload.dropLabel")}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              fileInputRef.current?.click();
            }
          }}
        >
          {uploading ? (
            <>
              <RefreshCw className="size-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">{t("upload.uploading")}</p>
            </>
          ) : (
            <>
              <Upload
                className={[
                  "size-8 transition-colors",
                  isDragOver ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              />
              <div>
                <p className="text-xs font-medium text-foreground">
                  {isDragOver ? t("upload.dropRelease") : t("upload.dropHint")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("upload.formats")}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
          aria-hidden="true"
        />

        {/* Upload button */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
        >
          {uploading ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? t("upload.uploading") : t("upload.choose")}
        </button>

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive">
            <X className="size-3.5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs leading-snug">{error}</p>
              <div className="flex gap-2">
                {retryFile && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-xs font-medium underline hover:no-underline"
                  >
                    {t("common.retryShort")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setError(null); setRetryFile(null); }}
                  className="text-xs underline hover:no-underline"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Recent uploads section ── */}
      <section className="px-3 pt-3 pb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {t("upload.recent")}
        </h3>

        {recentFiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileImage className="size-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">{t("upload.noRecent")}</p>
            <p className="text-xs text-muted-foreground/70 leading-snug max-w-[180px]">
              {t("upload.recentHint")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {recentFiles.map((file, i) => (
              <RecentFileThumbnail
                key={`${file.name}-${file.size}-${i}`}
                file={file}
                objectUrl={objectUrls.get(file) ?? null}
                onClick={() => processFile(file)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
