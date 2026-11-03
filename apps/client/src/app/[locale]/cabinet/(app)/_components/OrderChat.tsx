"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isImage, isVideo } from "@/components/file-viewer";
import { fmtTime } from "@/lib/utils";
import { playNotificationTone } from "@/lib/notifications";
import { type Lead, type Message, useCabinet } from "../_lib/cabinet";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Chat tab of one order: history, live updates, polling fallback and the composer. */
export function OrderChat({ lead, onOpenFile }: { lead: Lead; onOpenFile: (url: string) => void }) {
  const t = useTranslations("cabinet");
  const { subscribeMessages, setActiveChat, markRead, addUnread } = useCabinet();
  const endRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef(new Set<string>());

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const leadId = lead.id;

  // The chat is on screen: nothing here counts as unread.
  useEffect(() => {
    setActiveChat(leadId);
    markRead(leadId);
    return () => setActiveChat(null);
  }, [leadId, setActiveChat, markRead]);

  const append = useCallback((msg: Message) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/cabinet/messages?lead_id=${leadId}`);
      if (res.ok && !cancelled) setMessages((await res.json()) || []);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  useEffect(() => subscribeMessages((msg) => { if (msg.lead_id === leadId) append(msg); }), [subscribeMessages, leadId, append]);

  useEffect(() => {
    knownIds.current = new Set(messages.map((m) => m.id));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fallback when websocket updates are delayed or unavailable.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/cabinet/messages?lead_id=${leadId}`);
        if (!res.ok) return;
        const latest = (await res.json()) as Message[];
        const fresh = latest.filter((m) => !knownIds.current.has(m.id));
        if (fresh.length === 0) return;
        if (fresh.some((m) => m.sender === "manager")) playNotificationTone();
        setMessages(latest);
        markRead(leadId);
      } catch {
        // noop
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [leadId, markRead, addUnread]);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(t("chat.fileTooLarge", { name: f.name }));
        return false;
      }
      return true;
    });
    if (valid.length) setPendingFiles((p) => [...p, ...valid]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (!file) continue;
      const ext = item.type === "image/svg+xml" ? "svg" : item.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      files.push(new File([file], `pasted-image.${ext}`, { type: item.type }));
    }
    // SVG pasted as text (from a code editor or Figma)
    const text = e.clipboardData.getData("text/plain");
    if (!files.length && text.trimStart().startsWith("<svg")) {
      files.push(new File([new Blob([text], { type: "image/svg+xml" })], "pasted-image.svg", { type: "image/svg+xml" }));
    }
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const send = async () => {
    if (!input.trim() && !pendingFiles.length) return;
    setSending(true);
    try {
      let attachments: string[] = [];
      if (pendingFiles.length) {
        setUploading(true);
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        const up = await fetch("/api/cabinet/upload", { method: "POST", body: fd });
        if (up.ok) attachments = (await up.json()).results.map((r: { url: string }) => r.url);
        setUploading(false);
      }
      const res = await fetch("/api/cabinet/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, body: input.trim(), attachments }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string })?.error || `HTTP ${res.status}`);
      append(await res.json());
      setInput("");
      setPendingFiles([]);
    } catch (error) {
      toast.error(`Помилка при відправці: ${error instanceof Error ? error.message : "невідома"}`);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-6">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {lead.customer_data?.message && (
              <div className="flex justify-start">
                <div className="max-w-sm rounded-2xl rounded-bl-sm bg-muted p-3">
                  <p className="text-sm">{lead.customer_data.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}
            {messages.length === 0 && !lead.customer_data?.message && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="mb-2 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("chat.empty")}</p>
              </div>
            )}
            {messages.map((msg) => {
              const mine = msg.sender === "client";
              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
                  <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`max-w-xs rounded-2xl px-3.5 py-2.5 sm:max-w-sm ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground"}`}>
                      {msg.body && <p className="break-words text-sm leading-relaxed">{msg.body}</p>}
                      {msg.attachments?.length ? (
                        <div className={`mt-1.5 grid gap-1.5 ${msg.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                          {msg.attachments.map((url, i) =>
                            isImage(url) ? (
                              <button key={i} onClick={() => onOpenFile(url)} className="block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="w-full max-w-[150px] cursor-zoom-in rounded-xl object-cover transition-opacity hover:opacity-90 sm:max-w-[200px]" />
                              </button>
                            ) : isVideo(url) ? (
                              <button key={i} onClick={() => onOpenFile(url)} className="relative block">
                                <video src={url} className="w-full max-w-[150px] rounded-xl object-cover sm:max-w-[200px]" muted />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="flex size-8 items-center justify-center rounded-full bg-black/50"><span className="ml-0.5 text-xs text-white">▶</span></div>
                                </div>
                              </button>
                            ) : (
                              <button key={i} onClick={() => onOpenFile(url)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors ${mine ? "border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/10" : "border-border text-foreground hover:bg-background"}`}>
                                <FileText className="size-3.5 shrink-0" />
                                <span className="truncate">{decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Файл").slice(0, 20)}</span>
                              </button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 pb-0.5 text-[10px] text-muted-foreground">
                      {fmtTime(msg.created_at)}
                      {mine && (
                        <span className={`ml-0.5 inline-flex ${msg.read_at ? "text-primary" : "text-slate-300"}`}>
                          <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
                            <path d="M1 5l3 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M6 5l3 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-card px-3 py-2 sm:px-4 sm:py-3">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            {pendingFiles.map((f, i) => (
              <div key={i} className="group relative shrink-0">
                {uploading ? (
                  <div className="flex size-16 items-end justify-center gap-[3px] overflow-hidden rounded-xl border border-border bg-muted pb-2">
                    {[0, 1, 2, 3].map((j) => (
                      <span key={j} className="w-1 animate-pulse rounded-full bg-primary/40" style={{ height: `${28 + j * 6}px`, animationDelay: `${j * 0.12}s` }} />
                    ))}
                  </div>
                ) : f.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(f)} alt={f.name} className="size-16 rounded-xl border border-border object-cover" />
                ) : f.type.startsWith("video/") ? (
                  <video src={URL.createObjectURL(f)} className="size-16 rounded-xl border border-border object-cover" muted />
                ) : (
                  <div className="flex h-16 w-28 items-center gap-2 rounded-xl border border-border bg-muted px-2.5">
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs leading-tight">{f.name}</span>
                  </div>
                )}
                {!uploading && (
                  <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))} aria-label="Remove" className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:border-destructive hover:bg-destructive hover:text-white">
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground" aria-label={t("chat.attachLabel")}>
            <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.svg,.ai,.eps,.psd,.zip,.rar,.7z,.tar,.gz" className="hidden" onChange={(e) => { addFiles(e.target.files ? Array.from(e.target.files) : []); e.target.value = ""; }} />
            <Paperclip className="size-4" />
          </label>
          <Input
            placeholder={t("chat.placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            onPaste={handlePaste}
            disabled={sending}
            className="flex-1 text-sm"
          />
          <Button size="icon" onClick={send} aria-label={t("chat.sendLabel")} disabled={sending || uploading || (!input.trim() && !pendingFiles.length)}>
            {sending || uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
