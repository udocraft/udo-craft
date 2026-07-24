"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { playNotificationTone } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, STATUS_CONFIG } from "@/components/status-badge";
import { FileViewer, isImage, isVideo } from "@/components/file-viewer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  MessageCircle, Search, Send, Loader2, Info, X, Phone, Mail,
  Building2, FileText, Package, Calendar, ExternalLink, Paperclip,
  ChevronsUpDown, ArrowLeft, Trash2, ImageIcon, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { fmtTime, cn } from "@/lib/utils";
import { DashboardPage } from "@/components/dashboard-page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type LeadSource = "web" | "telegram" | "instagram";

interface Message {
  id: string;
  lead_id: string;
  body: string;
  sender: "client" | "manager";
  sender_email?: string;
  created_at: string;
  read_at?: string | null;
  attachments?: string[];
  channel?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  size: string;
  color: string;
  custom_print_url?: string;
  mockup_url?: string;
}

interface Lead {
  id: string;
  source?: LeadSource;
  tg_chat_id?: string;
  customer_data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    attachments?: string[];
    tg_username?: string;
  };
  created_at: string;
  updated_at?: string;
  status: string;
  total_amount_cents?: number;
  notes?: string;
  order_items?: OrderItem[];
}

const readLeadIds = new Set<string>();

const SOURCE_CONFIG = {
  telegram: { label: "TG", className: "bg-sky-100 text-sky-700" },
  instagram: { label: "IG", className: "bg-pink-100 text-pink-700" },
  web: { label: "Web", className: "bg-slate-100 text-slate-600" },
} as const;

const STATUSES = ["new", "in_progress", "production", "completed", "archived"] as const;
const STATUS_LABELS: Record<string, string> = {
  new: "Новий", in_progress: "В роботі", production: "Виробництво",
  completed: "Завершено", archived: "Архів",
};

function initials(name: string) {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedLeadRef = useRef<Lead | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const inputBarRef = useRef<HTMLDivElement>(null);
  const [inputBarHeight, setInputBarHeight] = useState(72);
  const prevMessageCountRef = useRef(0);
  const initialScrollDone = useRef(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/leads");
      if (!r.ok) throw new Error();
      setLeads(await r.json());
    } catch { toast.error("Помилка завантаження"); }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (leadId: string) => {
    setLoadingMessages(true);
    try {
      const r = await fetch(`/api/messages?lead_id=${leadId}`);
      if (r.ok && selectedLeadRef.current?.id === leadId) {
        const msgs = await r.json() as Message[];
        messageIdsRef.current = new Set(msgs.map((m) => m.id));
        setMessages(msgs);
      }
    } catch { /* non-critical */ }
    setLoadingMessages(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (!leads.length) return;
    const ids = leads.map((l) => l.id).join(",");
    fetch(`/api/messages?lead_ids=${ids}`)
      .then((r) => r.ok ? r.json() : {})
      .then((map: Record<string, Message>) => setLastMessages(map));
  }, [leads]);

  useEffect(() => {
    const leadId = searchParams.get("leadId");
    if (!leadId || !leads.length) return;
    const found = leads.find((l) => l.id === leadId);
    if (found) setSelectedLead(found);
  }, [leads, searchParams]);

  useEffect(() => {
    if (selectedLead) {
      setMessages([]);
      fetchMessages(selectedLead.id);
      prevMessageCountRef.current = 0;
      initialScrollDone.current = false;
      readLeadIds.add(selectedLead.id);
      setUnreadIds((prev) => { const n = new Set(prev); n.delete(selectedLead.id); return n; });
    }
  }, [selectedLead, fetchMessages]);

  useEffect(() => { selectedLeadRef.current = selectedLead; }, [selectedLead]);
  useEffect(() => { messageIdsRef.current = new Set(messages.map((m) => m.id)); }, [messages]);

  useEffect(() => {
    if (selectedLead && messages.length)
      setLastMessages((prev) => ({ ...prev, [selectedLead.id]: messages[messages.length - 1] }));
  }, [messages, selectedLead]);

  useEffect(() => {
    const ch = supabase.channel("admin-messages-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new: Message }) => {
          const m = payload.new;
          if (m.sender === "client") {
            playNotificationTone();
            toast.info("Нове повідомлення від клієнта");
            if (!selectedLeadRef.current || selectedLeadRef.current.id !== m.lead_id)
              setUnreadIds((prev) => new Set([...prev, m.lead_id]));
          }
          setLastMessages((prev) => ({ ...prev, [m.lead_id]: m }));
          if (m.sender === "client" && selectedLeadRef.current?.id === m.lead_id)
            setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLeads, supabase]);

  useEffect(() => {
    if (!inputBarRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setInputBarHeight(Math.ceil(e.contentRect.height) + 1);
    });
    ro.observe(inputBarRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const count = messages.length;
    if (count === 0) return;
    if (!initialScrollDone.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      initialScrollDone.current = true;
    } else if (count > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = count;
  }, [messages]);

  useEffect(() => {
    const iv = window.setInterval(async () => {
      const lead = selectedLeadRef.current;
      if (!lead) return;
      const leadIdAtStart = lead.id;
      try {
        const r = await fetch(`/api/messages?lead_id=${leadIdAtStart}`);
        if (!r.ok || selectedLeadRef.current?.id !== leadIdAtStart) return;
        const latest = (await r.json()) as Message[];
        const known = messageIdsRef.current;
        const fresh = latest.filter((m) => !known.has(m.id) && m.sender === "client" && !m.body?.startsWith("Статус змінено:"));
        if (fresh.length) setMessages(latest);
      } catch { /* noop */ }
    }, 4000);
    return () => window.clearInterval(iv);
  }, []);

  const filteredLeads = leads.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      l.customer_data?.name?.toLowerCase().includes(q) ||
      l.customer_data?.email?.toLowerCase().includes(q);
    const matchesSource = sourceFilter === "all" || (l.source ?? "web") === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedLead) return;
    const prev = selectedLead.status;
    setSelectedLead(s => s ? { ...s, status: newStatus } : s);
    setLeads(ls => ls.map(l => l.id === selectedLead.id ? { ...l, status: newStatus } : l));
    try {
      const r = await fetch(`/api/leads/${selectedLead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error();
      const sysBody = `Статус змінено: ${STATUS_LABELS[prev] || prev} → ${STATUS_LABELS[newStatus] || newStatus}`;
      const sysMsg: Message = { id: `sys-${Date.now()}`, lead_id: selectedLead.id, body: sysBody, sender: "manager", created_at: new Date().toISOString(), attachments: [] };
      setMessages(ms => [...ms, sysMsg]);
      const msgRes = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: selectedLead.id, body: sysBody, attachments: [] }) });
      if (msgRes.ok) { const realMsg = await msgRes.json() as Message; setMessages(ms => ms.map(m => m.id === sysMsg.id ? realMsg : m)); }
    } catch {
      setSelectedLead(s => s ? { ...s, status: prev } : s);
      setLeads(ls => ls.map(l => l.id === selectedLead.id ? { ...l, status: prev } : l));
      toast.error("Помилка зміни статусу");
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm(`Видалити чат з "${lead.customer_data?.name}"?`)) return;
    try {
      const r = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setLeads((ls) => ls.filter((l) => l.id !== lead.id));
      if (selectedLead?.id === lead.id) { setSelectedLead(null); setShowInfo(false); }
      toast.success("Чат видалено");
    } catch { toast.error("Помилка видалення"); }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => { if (f.size > MAX_FILE_SIZE) { toast.error(`"${f.name}" перевищує 10 МБ`); return false; } return true; });
    if (valid.length) setPendingFiles((p) => [...p, ...valid]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (!file) continue;
        const ext = item.type === "image/svg+xml" ? "svg" : item.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        files.push(new File([file], `pasted-image.${ext}`, { type: item.type }));
      }
    }
    const svgText = e.clipboardData.getData("text/plain");
    if (!files.length && svgText.trimStart().startsWith("<svg")) {
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      files.push(new File([blob], "pasted-image.svg", { type: "image/svg+xml" }));
    }
    if (files.length) { e.preventDefault(); addFiles(files); }
  };

  const handleSend = async () => {
    if (!selectedLead || (!replyText.trim() && !pendingFiles.length)) return;
    setSending(true);
    try {
      let attachments: string[] = [];
      if (pendingFiles.length) {
        setUploading(true);
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) throw new Error("Upload failed");
        const { results } = await up.json();
        attachments = results.map((x: { url: string }) => x.url);
        setUploading(false);
      }
      const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead_id: selectedLead.id, body: replyText.trim(), attachments }) });
      if (!r.ok) throw new Error((await r.json()).error);
      const newMsg = await r.json();
      setMessages((prev) => [...prev, newMsg]);
      setReplyText("");
      setPendingFiles([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Помилка відправки");
    } finally { setSending(false); setUploading(false); }
  };

  return (
    <DashboardPage title="Повідомлення" contentClassName="flex-1 flex flex-col overflow-hidden p-0 [&>div]:flex [&>div]:flex-col [&>div]:flex-1 [&>div]:overflow-hidden">
      {viewerUrl && <FileViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Chat list ── */}
        <aside className={cn(
          "flex flex-col border-r border-border/60 bg-card shrink-0",
          "w-full md:w-[280px]",
          selectedLead ? "hidden md:flex" : "flex"
        )}>
          {/* Search + filters */}
          <div className="px-3 pt-3 pb-2 space-y-2 border-b border-border/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук розмов..."
                className="pl-8 h-8 text-xs bg-muted/40 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "web", "telegram", "instagram"] as const).map((s) => {
                const active = sourceFilter === s;
                return (
                  <button key={s} onClick={() => setSourceFilter(s as LeadSource | "all")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                    {s === "all" && "Всі"}
                    {s === "web" && <><Globe className="size-3" />Web</>}
                    {s === "telegram" && "TG"}
                    {s === "instagram" && "IG"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <EmptyState icon={MessageCircle} title={searchQuery ? "Нічого не знайдено" : "Немає розмов"} className="py-12" />
            ) : filteredLeads.map((lead) => {
              const isUnread = unreadIds.has(lead.id);
              const isActive = selectedLead?.id === lead.id;
              const last = lastMessages[lead.id];
              const src = SOURCE_CONFIG[lead.source as keyof typeof SOURCE_CONFIG];
              return (
                <button key={lead.id} onClick={() => setSelectedLead(lead)}
                  className={cn(
                    "w-full text-left px-3 py-3 border-b border-border/30 transition-colors group relative",
                    isActive ? "bg-primary/5 border-l-2 border-l-primary" : isUnread ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-muted/40"
                  )}>
                  <div className="flex items-start gap-2.5">
                    <Avatar className="size-8 shrink-0 mt-0.5">
                      <AvatarFallback className={cn("text-xs font-semibold", isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                        {initials(lead.customer_data?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={cn("text-xs truncate", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
                          {lead.customer_data?.name}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {src && <Badge variant="outline" className={cn("h-4 px-1 text-[9px] font-semibold border-0", src.className)}>{src.label}</Badge>}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(last ? last.created_at : lead.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-1">
                        <p className="text-[11px] text-muted-foreground truncate flex-1 leading-relaxed">
                          {last ? (
                            <>{last.sender === "manager" && <span className="font-medium text-foreground/60">Ви: </span>}
                            {last.attachments?.length && !last.body ? "📎 Вкладення" : last.body.slice(0, 50)}</>
                          ) : lead.customer_data?.message?.slice(0, 50)}
                        </p>
                        {isUnread && <span className="size-1.5 rounded-full bg-primary shrink-0 mb-0.5" />}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead); }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 size-6 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all">
                    <Trash2 className="size-3" />
                  </button>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Chat area ── */}
        {selectedLead ? (
          <div className="flex flex-1 min-w-0 overflow-hidden">
            <div className="flex-1 relative overflow-hidden bg-background">
              {/* Chat header */}
              <div className="absolute top-0 left-0 right-0 h-14 border-b border-border/60 bg-card/90 backdrop-blur-sm z-10 flex items-center px-3 gap-2.5">
                <button className="md:hidden shrink-0 size-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                  onClick={() => { setSelectedLead(null); setShowInfo(false); }}>
                  <ArrowLeft className="size-4" />
                </button>
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {initials(selectedLead.customer_data?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">{selectedLead.customer_data?.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{selectedLead.customer_data?.company || selectedLead.customer_data?.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                      <StatusBadge status={selectedLead.status} />
                      <ChevronsUpDown className="size-3 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {STATUSES.map(s => (
                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="gap-2 text-xs">
                          <span className={cn("size-2 rounded-full shrink-0", STATUS_CONFIG[s]?.dot)} />
                          {STATUS_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant={showInfo ? "secondary" : "ghost"} size="icon-sm"
                    className={cn("transition-colors", showInfo && "text-primary")}
                    onClick={() => setShowInfo((v) => !v)}>
                    <Info className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Messages scroll area */}
              <div className="absolute top-14 left-0 right-0 overflow-y-auto px-4 py-5 space-y-3"
                style={{ bottom: inputBarHeight }}>
                {loadingMessages ? (
                  <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {selectedLead.customer_data?.message && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] md:max-w-sm bg-muted/60 border border-border/40 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Початкове повідомлення</p>
                          <p className="text-sm leading-relaxed">{selectedLead.customer_data.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(selectedLead.created_at).toLocaleString("uk-UA")}</p>
                        </div>
                      </div>
                    )}
                    {messages.map((msg) => {
                      const isMgr = msg.sender === "manager";
                      const isSystem = isMgr && msg.body?.startsWith("Статус змінено:");
                      if (isSystem) return (
                        <div key={msg.id} className="flex items-center gap-3 py-0.5">
                          <div className="flex-1 h-px bg-border/40" />
                          <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap px-1">{msg.body} · {fmtTime(msg.created_at)}</span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>
                      );
                      return (
                        <div key={msg.id} className={cn("flex flex-col gap-0.5", isMgr ? "items-end" : "items-start")}>
                          <div className={cn("flex items-end gap-1.5", isMgr ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                              "max-w-[80%] md:max-w-sm rounded-2xl px-3.5 py-2.5",
                              isMgr ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                            )}>
                              {msg.body && <p className="text-sm leading-relaxed">{msg.body}</p>}
                              {msg.attachments?.length ? (
                                <div className={cn("gap-1.5 mt-2", msg.attachments.length > 1 ? "grid grid-cols-2" : "flex")}>
                                  {msg.attachments.map((url, i) =>
                                    isImage(url) ? (
                                      <button key={i} onClick={() => setViewerUrl(url)} className="block rounded-xl overflow-hidden">
                                        <img src={url} alt="" className="max-w-[200px] w-full object-cover hover:opacity-90 transition-opacity" />
                                      </button>
                                    ) : isVideo(url) ? (
                                      <button key={i} onClick={() => setViewerUrl(url)} className="relative block">
                                        <video src={url} className="rounded-xl max-w-[200px] w-full" muted />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="size-8 rounded-full bg-black/40 flex items-center justify-center">
                                            <span className="text-white text-xs ml-0.5">▶</span>
                                          </div>
                                        </div>
                                      </button>
                                    ) : (
                                      <button key={i} onClick={() => setViewerUrl(url)}
                                        className={cn("flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border transition-colors",
                                          isMgr ? "border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/10" : "border-border text-foreground hover:bg-background")}>
                                        <FileText className="size-3.5 shrink-0" />
                                        <span className="truncate max-w-[140px]">{decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Файл").slice(0, 24)}</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0 pb-0.5 flex items-center gap-0.5">
                              {fmtTime(msg.created_at)}
                              {isMgr && (
                                <span className={cn("inline-flex ml-0.5", msg.read_at ? "text-primary" : "text-muted-foreground/30")}>
                                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                                    <path d="M1 5l3 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M6 5l3 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input bar */}
              <div ref={inputBarRef} className="absolute bottom-0 left-0 right-0 border-t border-border/60 bg-card px-3 py-3 space-y-2">
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="relative group shrink-0">
                        {f.type.startsWith("image/") ? (
                          <img src={URL.createObjectURL(f)} alt={f.name} className="h-14 w-14 object-cover rounded-lg border border-border" />
                        ) : f.type.startsWith("video/") ? (
                          <video src={URL.createObjectURL(f)} className="h-14 w-14 object-cover rounded-lg border border-border" muted />
                        ) : (
                          <div className="h-14 w-24 flex items-center gap-1.5 px-2 rounded-lg border border-border bg-muted">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="text-[10px] text-foreground truncate">{f.name}</span>
                          </div>
                        )}
                        <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-destructive hover:text-white transition-colors">
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <label className="size-8 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors">
                    <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.svg,.ai,.eps,.psd,.zip" className="hidden"
                      onChange={(e) => { const files = e.target.files ? Array.from(e.target.files) : []; addFiles(files); e.target.value = ""; }} />
                    <Paperclip className="size-4" />
                  </label>
                  <Input
                    placeholder="Напишіть відповідь..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    onPaste={handlePaste}
                    disabled={sending}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button onClick={handleSend} disabled={sending || uploading || (!replyText.trim() && !pendingFiles.length)} size="icon" className="size-9 shrink-0">
                    {sending || uploading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Info panel ── */}
            {showInfo && (
              <aside className="absolute inset-0 z-20 flex flex-col bg-card md:relative md:inset-auto md:z-auto md:w-72 md:shrink-0 md:border-l md:border-border/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
                  <span className="text-sm font-semibold">Деталі</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLead(selectedLead)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setShowInfo(false)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {/* Client header */}
                  <div className="flex flex-col items-center pt-5 pb-4 px-4 border-b border-border/40">
                    <Avatar className="size-14 mb-3">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                        {initials(selectedLead.customer_data?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm text-center">{selectedLead.customer_data?.name}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="mt-2 flex items-center gap-1 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                        <StatusBadge status={selectedLead.status} />
                        <ChevronsUpDown className="size-3 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        {STATUSES.map(s => (
                          <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="gap-2 text-xs">
                            <span className={cn("size-2 rounded-full shrink-0", STATUS_CONFIG[s]?.dot)} />
                            {STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Замовлення button */}
                  <div className="px-4 py-3 border-b border-border/40">
                    <button
                      onClick={() => router.push(`/orders?leadId=${selectedLead.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-white hover:bg-muted/40 transition-colors text-sm font-medium text-foreground"
                    >
                      <Package className="size-4 text-muted-foreground/60 shrink-0" />
                      Переглянути замовлення
                    </button>
                  </div>

                  {/* Contact info */}
                  <InfoSection label="КОНТАКТИ">
                    {selectedLead.customer_data?.phone && <InfoDetailRow icon={Phone} value={selectedLead.customer_data.phone} href={`tel:${selectedLead.customer_data.phone}`} />}
                    {selectedLead.customer_data?.tg_username && <InfoDetailRow icon={MessageCircle} value={`@${selectedLead.customer_data.tg_username}`} label="Telegram" />}
                    {selectedLead.customer_data?.email && <InfoDetailRow icon={Mail} value={selectedLead.customer_data.email} href={`mailto:${selectedLead.customer_data.email}`} />}
                    {selectedLead.customer_data?.company && <InfoDetailRow icon={Building2} value={selectedLead.customer_data.company} />}
                    <InfoDetailRow icon={Calendar} value={new Date(selectedLead.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })} label="Звернення" />
                    {(selectedLead.total_amount_cents ?? 0) > 0 && (
                      <InfoDetailRow icon={FileText} value={`₴${((selectedLead.total_amount_cents ?? 0) / 100).toFixed(0)}`} label="Сума" />
                    )}
                  </InfoSection>

                  {/* Initial message */}
                  {selectedLead.customer_data?.message && (
                    <InfoSection label="ПОЧАТКОВЕ ПОВІДОМЛЕННЯ">
                      <p className="text-xs text-foreground/80 leading-relaxed">{selectedLead.customer_data.message}</p>
                    </InfoSection>
                  )}

                  {/* Notes */}
                  {selectedLead.notes && (
                    <InfoSection label="НОТАТКИ">
                      <p className="text-xs text-foreground/80 leading-relaxed">{selectedLead.notes}</p>
                    </InfoSection>
                  )}

                  {/* Order items with full print details */}
                  {selectedLead.order_items && selectedLead.order_items.length > 0 && (
                    <InfoSection label={`ТОВАРИ (${selectedLead.order_items.length})`}>
                      <div className="space-y-3">
                        {selectedLead.order_items.map((item) => (
                          <div key={item.id} className="rounded-xl border border-border/60 bg-background overflow-hidden">
                            {item.mockup_url && (
                              <button onClick={() => setViewerUrl(item.mockup_url!)} className="block w-full aspect-video bg-muted/30">
                                <img src={item.mockup_url} alt="Макет" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                              </button>
                            )}
                            <div className="px-3 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-foreground">{item.color} / {item.size}</p>
                                <span className="text-[10px] font-medium text-muted-foreground">×{item.quantity}</span>
                              </div>
                              {item.custom_print_url && (
                                <a href={item.custom_print_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1.5">
                                  <ExternalLink className="size-2.5" /> Переглянути принт
                                </a>
                              )}
                              {!item.mockup_url && !item.custom_print_url && (
                                <div className="flex items-center gap-2 mt-1">
                                  <ImageIcon className="size-3 text-muted-foreground/40" />
                                  <span className="text-[10px] text-muted-foreground">Без макету</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </InfoSection>
                  )}

                  {/* Attachments */}
                  {selectedLead.customer_data?.attachments?.length ? (
                    <InfoSection label={`ВКЛАДЕННЯ (${selectedLead.customer_data.attachments.length})`}>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedLead.customer_data.attachments.map((url, i) =>
                          isImage(url) ? (
                            <button key={i} onClick={() => setViewerUrl(url)} className="aspect-square rounded-lg overflow-hidden border border-border/60">
                              <img src={url} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                            </button>
                          ) : (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2.5 rounded-lg border border-border/60 hover:bg-muted transition-colors text-xs text-primary">
                              <FileText className="size-3.5 shrink-0" />
                              <span className="truncate">Файл {i + 1}</span>
                            </a>
                          )
                        )}
                      </div>
                    </InfoSection>
                  ) : null}
                </div>
              </aside>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-muted/10">
            <EmptyState icon={MessageCircle} title="Оберіть розмову" description="Натисніть на контакт зліва, щоб відкрити чат" />
          </div>
        )}
      </div>
    </DashboardPage>
  );
}

function InfoSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-border/40">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 mb-2.5">{label}</p>
      {children}
    </div>
  );
}

function InfoDetailRow({ icon: Icon, value, label, href }: { icon: React.ComponentType<{ className?: string }>; value: string; label?: string; href?: string }) {
  return (
    <div className="flex items-start gap-2.5 py-0.5">
      <Icon className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        {href ? (
          <a href={href} className="text-xs text-primary hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-xs text-foreground/90 truncate">{value}</p>
        )}
        {label && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>}
      </div>
    </div>
  );
}
