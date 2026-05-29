"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { playNotificationTone } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, STATUS_CONFIG } from "@/components/status-badge";
import { FileViewer, isImage, isVideo, fileName as getFileName } from "@/components/file-viewer";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle, Search, Send, Loader2, ClipboardList,
  Info, X, Phone, Mail, Building2, FileText, Package,
  Calendar, ExternalLink, Paperclip, ChevronsUpDown, ArrowLeft, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { fmtTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

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
        // Seed the known IDs so polling doesn't treat existing messages as new
        messageIdsRef.current = new Set(msgs.map((m: Message) => m.id));
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
    if (selectedLead && messages.length) {
      setLastMessages((prev) => ({ ...prev, [selectedLead.id]: messages[messages.length - 1] }));
    }
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
          // Only append client messages via realtime — manager messages are added optimistically in handleSend
          if (m.sender === "client" && selectedLeadRef.current?.id === m.lead_id)
            setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLeads, supabase]);

  const inputBarRef = useRef<HTMLDivElement>(null);
  const [inputBarHeight, setInputBarHeight] = useState(72);
  const prevMessageCountRef = useRef(0);
  const initialScrollDone = useRef(false);

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
      // First load — jump instantly to bottom, no animation
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      initialScrollDone.current = true;
    } else if (count > prevMessageCountRef.current) {
      // Genuinely new message — smooth scroll
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
        if (!r.ok) return;
        // Bail if user switched chats while fetch was in flight
        if (selectedLeadRef.current?.id !== leadIdAtStart) return;
        const latest = (await r.json()) as Message[];
        const known = messageIdsRef.current;
        // Only notify about genuinely new CLIENT messages (not system/manager)
        const fresh = latest.filter((m) => !known.has(m.id) && m.sender === "client" && !m.body?.startsWith("Статус змінено:"));
        if (fresh.length) {
          setMessages(latest);
        }
      } catch { /* noop */ }
    }, 4000);
    return () => window.clearInterval(iv);
  }, []);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.customer_data?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.customer_data?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || (l.source ?? "web") === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const STATUSES = ["new", "in_progress", "production", "completed", "archived"] as const;
  const STATUS_LABELS: Record<string, string> = {
    new: "Новий", in_progress: "В роботі", production: "Виробництво", completed: "Завершено", archived: "Архів",
  };

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
      // Append system message optimistically — no reload
      const prevLabel = STATUS_LABELS[prev] || prev;
      const label = STATUS_LABELS[newStatus] || newStatus;
      const sysBody = `Статус змінено: ${prevLabel} → ${label}`;
      const sysMsg: Message = {
        id: `sys-${Date.now()}`,
        lead_id: selectedLead.id,
        body: sysBody,
        sender: "manager",
        created_at: new Date().toISOString(),
        attachments: [],
      };
      setMessages(ms => [...ms, sysMsg]);
      // Persist to DB and replace optimistic msg with real one
      const msgRes = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: selectedLead.id, body: sysBody, attachments: [] }),
      });
      if (msgRes.ok) {
        const realMsg = await msgRes.json() as Message;
        // Replace optimistic with real so polling doesn't see it as new
        setMessages(ms => ms.map(m => m.id === sysMsg.id ? realMsg : m));
      }
    } catch {
      setSelectedLead(s => s ? { ...s, status: prev } : s);
      setLeads(ls => ls.map(l => l.id === selectedLead.id ? { ...l, status: prev } : l));
      toast.error("Помилка зміни статусу");
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm(`Видалити чат з "${lead.customer_data?.name}"? Це незворотно.`)) return;
    try {
      const r = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setLeads((ls) => ls.filter((l) => l.id !== lead.id));
      if (selectedLead?.id === lead.id) { setSelectedLead(null); setShowInfo(false); }
      toast.success("Чат видалено");
    } catch {
      toast.error("Помилка видалення");
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed");
    const { results } = await r.json();
    return results.map((x: { url: string }) => x.url);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" перевищує 10 МБ`);
        return false;
      }
      return true;
    });
    if (valid.length) setPendingFiles((p) => [...p, ...valid]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (!file) continue;
        const ext = item.type === "image/svg+xml" ? "svg"
          : item.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        files.push(new File([file], `pasted-image.${ext}`, { type: item.type }));
      }
    }

    // SVG pasted as text (e.g. from code editor or Figma)
    const svgText = e.clipboardData.getData("text/plain");
    if (!files.length && svgText.trimStart().startsWith("<svg")) {
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      files.push(new File([blob], "pasted-image.svg", { type: "image/svg+xml" }));
    }

    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const handleSend = async () => {
    if (!selectedLead || (!replyText.trim() && !pendingFiles.length)) return;
    setSending(true);
    try {
      let attachments: string[] = [];
      if (pendingFiles.length) {
        setUploading(true);
        attachments = await uploadFiles(pendingFiles);
        setUploading(false);
      }
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: selectedLead.id, body: replyText.trim(), attachments }),
      });
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
    <div className="flex flex-1 h-0 flex-col overflow-hidden relative">
      {viewerUrl && <FileViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}
      <PageHeader title="Повідомлення" />
      <div className="flex flex-1 h-0 overflow-hidden relative">

      {/* ── Chat list — full screen on mobile, fixed sidebar on desktop ── */}
      <div className={`${selectedLead ? "hidden md:flex" : "flex"} w-full md:w-72 shrink-0 flex-col border-r border-border bg-card`}>
        <div className="px-3 py-2 border-b border-border bg-card shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Пошук..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-sm" />
          </div>
          <div className="flex gap-1 mt-2">
            {(["all", "web", "telegram", "instagram"] as const).map((s) => (
              <button key={s} onClick={() => setSourceFilter(s as LeadSource | "all")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  sourceFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {s === "all" && "Всі"}
                {s === "web" && <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Web</>}
                {s === "telegram" && <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.9l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.659z"/></svg>TG</>}
                {s === "instagram" && <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>IG</>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredLeads.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title={searchQuery || sourceFilter !== "all" ? "Нічого не знайдено" : "Немає розмов"}
              description={searchQuery || sourceFilter !== "all" ? "Спробуйте змінити фільтри" : "Нові повідомлення від клієнтів з'являться тут"}
              className="py-10"
            />
          ) : filteredLeads.map((lead) => {
            const isUnread = unreadIds.has(lead.id);
            const isActive = selectedLead?.id === lead.id;
            const last = lastMessages[lead.id];
            return (
              <button key={lead.id} onClick={() => setSelectedLead(lead)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors group ${
                  isActive ? "bg-primary/5 border-l-2 border-l-primary"
                  : isUnread ? "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50"
                  : "hover:bg-muted/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm truncate flex-1 ${isUnread ? "font-semibold" : "font-medium"}`}>
                    {lead.customer_data?.name}
                    {lead.customer_data?.company && <span className="text-muted-foreground font-normal text-xs"> · {lead.customer_data.company}</span>}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {(lead.source === "telegram") && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 font-medium">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.9l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.659z"/></svg>
                        TG
                      </span>
                    )}
                    {(lead.source === "instagram") && (
                      <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 font-medium">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                        IG
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(last ? last.created_at : lead.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead); }}
                      className="opacity-0 group-hover:opacity-100 ml-0.5 w-5 h-5 flex items-center justify-center rounded hover:text-destructive transition-all shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {last ? (
                      <>{last.sender === "manager" && <span className="font-semibold text-foreground/70">Ви: </span>}
                      {last.attachments?.length && !last.body ? "📎 Вкладення" : last.body.slice(0, 55)}</>
                    ) : lead.customer_data?.message?.slice(0, 60)}
                  </p>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mb-0.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat area — full screen on mobile, flex-1 on desktop ── */}
      {selectedLead ? (
        <div className="flex flex-1 overflow-hidden min-h-0 w-full">
          <div className="flex-1 relative overflow-hidden bg-background">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-14 px-3 border-b border-border flex items-center justify-between bg-card z-10 gap-2">
              {/* Back button — mobile only */}
              <button className="md:hidden shrink-0 w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                onClick={() => { setSelectedLead(null); setShowInfo(false); }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{selectedLead.customer_data?.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{selectedLead.customer_data?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedLead.customer_data?.company || selectedLead.customer_data?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full cursor-pointer">
                    <StatusBadge status={selectedLead.status} />
                    <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUSES.map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="gap-2">
                        <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.className ?? ""}`} />
                        {STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Separator orientation="vertical" className="h-5 mx-1" />
                <Button variant={showInfo ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setShowInfo((v) => !v)}>
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages — scrollable between header and input */}
            <div className="absolute top-14 left-0 right-0 overflow-y-auto px-4 py-4 space-y-3" style={{ bottom: inputBarHeight }}>
              {loadingMessages ? (
                <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {selectedLead.customer_data?.message && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] md:max-w-sm bg-muted rounded-2xl rounded-bl-sm p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Початкове повідомлення</p>
                        <p className="text-sm">{selectedLead.customer_data.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(selectedLead.created_at).toLocaleString("uk-UA")}</p>
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isMgr = msg.sender === "manager";
                    const isSystem = isMgr && msg.body?.startsWith("Статус змінено:");

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex items-center gap-3 py-1">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {msg.body} · {fmtTime(msg.created_at)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col gap-0.5 ${isMgr ? "items-end" : "items-start"}`}>
                        <div className={`flex items-end gap-1.5 ${isMgr ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`max-w-[85%] md:max-w-sm rounded-2xl px-3.5 py-2.5 ${isMgr ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                            {msg.body && <p className="text-sm leading-relaxed">{msg.body}</p>}
                            {msg.attachments?.length ? (
                              <div className={`grid gap-1.5 mt-1.5 ${msg.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                                {msg.attachments.map((url, i) =>
                                  isImage(url) ? (
                                    <button key={i} onClick={() => setViewerUrl(url)} className="block">
                                      <img src={url} alt="" className="rounded-xl max-w-[200px] w-full object-cover hover:opacity-90 transition-opacity cursor-zoom-in" />
                                    </button>
                                  ) : isVideo(url) ? (
                                    <button key={i} onClick={() => setViewerUrl(url)} className="block relative">
                                      <video src={url} className="rounded-xl max-w-[200px] w-full object-cover" muted />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                                          <span className="text-white text-xs ml-0.5">▶</span>
                                        </div>
                                      </div>
                                    </button>
                                  ) : (
                                    <button key={i} onClick={() => setViewerUrl(url)}
                                      className={`flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border ${isMgr ? "border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/10" : "border-border text-foreground hover:bg-background"} transition-colors`}>
                                      <FileText className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Файл").slice(0, 28)}</span>
                                    </button>
                                  )
                                )}
                              </div>
                            ) : null}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 pb-0.5 flex items-center gap-0.5">
                            {fmtTime(msg.created_at)}
                            {isMgr && (
                              <span className={`inline-flex ml-0.5 ${msg.read_at ? "text-primary" : "text-slate-300"}`}>
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

            {/* Input bar — fixed to bottom */}
            <div ref={inputBarRef} className="absolute bottom-0 left-0 right-0 border-t border-border px-3 py-3 bg-card space-y-2">
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="relative group flex-shrink-0">
                      {uploading ? (
                        <div className="h-16 w-16 rounded-xl border border-border overflow-hidden bg-muted flex items-end justify-center gap-[3px] pb-2">
                          {[0, 1, 2, 3].map((j) => (
                            <span key={j} className="w-1 rounded-full bg-primary/40 animate-pulse"
                              style={{ height: `${28 + j * 6}px`, animationDelay: `${j * 0.12}s` }} />
                          ))}
                        </div>
                      ) : f.type.startsWith("image/") ? (
                        <img src={URL.createObjectURL(f)} alt={f.name}
                          className="h-16 w-16 object-cover rounded-xl border border-border" />
                      ) : f.type.startsWith("video/") ? (
                        <video src={URL.createObjectURL(f)} className="h-16 w-16 object-cover rounded-xl border border-border" muted />
                      ) : (
                        <div className="h-16 w-28 flex items-center gap-2 px-2.5 rounded-xl border border-border bg-muted">
                          <FileText className="w-5 h-5 shrink-0 text-muted-foreground" />
                          <span className="text-xs text-foreground truncate leading-tight">{f.name}</span>
                        </div>
                      )}
                      {!uploading && (
                        <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-destructive hover:border-destructive hover:text-white transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <label className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                  <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.svg,.ai,.eps,.psd,.zip,.rar,.7z,.tar,.gz" className="hidden"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      addFiles(files);
                      e.target.value = "";
                    }} />
                  <Paperclip className="w-4 h-4" />
                </label>
                <Input placeholder="Напишіть відповідь..." value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onPaste={handlePaste}
                  disabled={sending} className="flex-1" />
                <Button onClick={handleSend} disabled={sending || uploading || (!replyText.trim() && !pendingFiles.length)} size="icon">
                  {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Info panel — overlays on mobile, fixed panel on desktop ── */}
          {showInfo && (
            <div className="absolute inset-0 z-20 bg-card flex flex-col md:relative md:inset-auto md:z-auto md:w-80 md:shrink-0 md:border-l md:border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <span className="font-semibold text-sm">Інфо про клієнта</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteLead(selectedLead)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowInfo(false)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center py-6 px-4 border-b border-border">
                  <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-primary">{selectedLead.customer_data?.name?.[0]?.toUpperCase() || "?"}</span>
                  </div>
                  <p className="font-semibold text-base text-center">{selectedLead.customer_data?.name}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="mt-1.5 flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full cursor-pointer">
                      <StatusBadge status={selectedLead.status} />
                      <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      {STATUSES.map(s => (
                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="gap-2">
                          <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.className ?? ""}`} />
                          {STATUS_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="px-4 pb-4">
                  <Button variant="outline" className="w-full gap-2" onClick={() => router.push(`/orders?leadId=${selectedLead.id}`)}>
                    <ClipboardList className="w-4 h-4" /> Замовлення
                  </Button>
                </div>
                <div className="px-4 py-4 space-y-3 border-b border-border">
                  {selectedLead.customer_data?.phone && (
                    <div className="flex items-start gap-3"><Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{selectedLead.customer_data.phone}</p><p className="text-xs text-muted-foreground">Телефон</p></div></div>
                  )}
                  {selectedLead.customer_data?.tg_username && (
                    <div className="flex items-start gap-3"><span className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 text-xs font-bold">TG</span><div><p className="text-sm">{selectedLead.customer_data.tg_username}</p><p className="text-xs text-muted-foreground">Telegram</p></div></div>
                  )}
                  <div className="flex items-start gap-3"><Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm break-all">{selectedLead.customer_data?.email}</p><p className="text-xs text-muted-foreground">Email</p></div></div>
                  {selectedLead.customer_data?.company && (
                    <div className="flex items-start gap-3"><Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{selectedLead.customer_data.company}</p><p className="text-xs text-muted-foreground">Компанія</p></div></div>
                  )}
                  <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{new Date(selectedLead.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-xs text-muted-foreground">Дата звернення</p></div></div>
                  {(selectedLead.total_amount_cents ?? 0) > 0 && (
                    <div className="flex items-start gap-3"><FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm font-medium">₴{((selectedLead.total_amount_cents ?? 0) / 100).toFixed(0)}</p><p className="text-xs text-muted-foreground">Сума замовлення</p></div></div>
                  )}
                </div>
                {selectedLead.customer_data?.message && (
                  <div className="px-4 py-4 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Початкове повідомлення</p>
                    <p className="text-sm leading-relaxed">{selectedLead.customer_data.message}</p>
                  </div>
                )}
                {selectedLead.notes && (
                  <div className="px-4 py-4 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Нотатки</p>
                    <p className="text-sm leading-relaxed">{selectedLead.notes}</p>
                  </div>
                )}
                {selectedLead.order_items && selectedLead.order_items.length > 0 && (
                  <div className="px-4 py-4 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Позиції ({selectedLead.order_items.length})</p>
                    <div className="space-y-3">
                      {selectedLead.order_items.map((item) => (
                        <div key={item.id} className="flex gap-3 items-start">
                          {item.mockup_url ? <img src={item.mockup_url} alt="" className="w-12 h-12 rounded-md object-cover border border-border shrink-0" /> : <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-muted-foreground" /></div>}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{item.color} / {item.size}</p>
                            <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                            {item.custom_print_url && <a href={item.custom_print_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"><ExternalLink className="w-3 h-3" /> Принт</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedLead.customer_data?.attachments?.length ? (
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Вкладення ({selectedLead.customer_data.attachments.length})</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedLead.customer_data.attachments.map((url, i) =>
                        isImage(url) ? (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="" className="w-full aspect-square object-cover rounded-md border border-border hover:opacity-80 transition-opacity" /></a>
                        ) : (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted transition-colors text-xs text-primary truncate"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">Файл {i + 1}</span></a>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
          <EmptyState icon={MessageCircle} title="Оберіть розмову" description="Натисніть на контакт зліва" />
        </div>
      )}
      </div>
    </div>
  );
}
