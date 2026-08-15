"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePDF } from "@/lib/generate-invoice";
import { enableNotificationAudio, playNotificationTone } from "@/lib/notifications";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogoFull } from "@/components/brand-logo";
import type { User } from "@supabase/supabase-js";
import { fmtTime } from "@/lib/utils";
import {
  LogOut, Send, Paperclip, Download, Package, Clock,
  CheckCircle2, Loader2, MessageCircle,
  FileText, Image as ImageIcon, ArrowLeft, X,
  Phone, Mail, Building2, Calendar, ExternalLink, Settings,
  FolderOpen,
} from "lucide-react";
import { FileViewer, isImage, isVideo } from "@/components/file-viewer";
import { aggregateOrderFiles } from "@/lib/aggregateOrderFiles";

function SimpleLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface OrderItem {
  id: string;
  product_id: string;
  size: string;
  color: string;
  quantity: number;
  custom_print_url?: string;
  mockup_url?: string;
  technical_metadata?: { offset_top_mm?: number; print_size_mm?: [number, number] };
  unit_price_cents?: number | null;
  print_cost_cents?: number | null;
}

interface Lead {
  id: string;
  status: "new" | "in_progress" | "production" | "completed" | "archived";
  customer_data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    attachments?: string[];
    delivery?: string;
    deadline?: string;
    comment?: string;
  };
  total_amount_cents: number;
  created_at: string;
  order_items?: OrderItem[];
}

interface Message {
  id: string;
  lead_id: string;
  body: string;
  sender: "client" | "manager";
  sender_email?: string;
  created_at: string;
  read_at?: string | null;
  attachments?: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new:         { label: "Нова заявка",    color: "bg-blue-100 text-blue-700",    icon: Clock },
  in_progress: { label: "В роботі",       color: "bg-amber-100 text-amber-700",  icon: Clock },
  production:  { label: "Виробництво",    color: "bg-violet-100 text-violet-700", icon: Package },
  completed:   { label: "Завершено",      color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  archived:    { label: "Архів",          color: "bg-gray-100 text-gray-600",    icon: Package },
};

const DELIVERY_LABELS: Record<string, string> = {
  nova_poshta: "Нова Пошта",
  ukrposhta: "Укрпошта",
  pickup: "Самовивіз",
};

export default function CabinetPage() {
  const t = useTranslations("cabinet");
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    new:         { label: t("status.new"),         color: "bg-blue-100 text-blue-700",    icon: Clock },
    in_progress: { label: t("status.in_progress"), color: "bg-amber-100 text-amber-700",  icon: Clock },
    production:  { label: t("status.production"),  color: "bg-violet-100 text-violet-700", icon: Package },
    completed:   { label: t("status.completed"),   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    archived:    { label: t("status.archived"),    color: "bg-gray-100 text-gray-600",    icon: Package },
  };

  const deliveryLabels: Record<string, string> = {
    nova_poshta: t("delivery.nova_poshta"),
    ukrposhta: t("delivery.ukrposhta"),
    pickup: t("delivery.pickup"),
  };
  const leadsRef = useRef<Lead[]>([]);
  const selectedLeadRef = useRef<Lead | null>(null);
  const activeTabRef = useRef<"details" | "chat" | "files">("details");
  const messageIdsRef = useRef<Set<string>>(new Set());

  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "chat" | "files">("details");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [unreadByLead, setUnreadByLead] = useState<Record<string, number>>({});
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  // Aggregate all files for the selected order (print URLs + client message attachments)
  const orderFiles = useMemo<string[]>(() => {
    if (!selectedLead) return [];
    return aggregateOrderFiles(
      selectedLead as unknown as Parameters<typeof aggregateOrderFiles>[0],
      messages as unknown as Parameters<typeof aggregateOrderFiles>[1]
    );
  }, [selectedLead, messages]);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: User | null } }) => {
      const authUser = res.data.user;
      if (!authUser) {
        router.push("/cabinet/login");
      } else {
        setUser({ email: authUser.email!, id: authUser.id });
      }
    });
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cabinet/leads");
    if (res.status === 401) { router.push("/cabinet/login"); return; }
    const data = await res.json();
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchLeads();
  }, [user, fetchLeads]);

  const fetchMessages = useCallback(async (leadId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/cabinet/messages?lead_id=${leadId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data || []);
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (selectedLead) fetchMessages(selectedLead.id);
  }, [selectedLead, fetchMessages]);

  useEffect(() => {
    if (selectedLead && activeTab === "chat") {
      setUnreadByLead((prev) => ({ ...prev, [selectedLead.id]: 0 }));
    }
  }, [activeTab, selectedLead]);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    selectedLeadRef.current = selectedLead;
  }, [selectedLead]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const unlockAudio = () => enableNotificationAudio();
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setActiveTab("details");
    setMobileView("detail");
    setUnreadByLead((prev) => ({ ...prev, [lead.id]: 0 }));
  };

  const handleChatShortcut = (lead: Lead) => {
    setSelectedLead(lead);
    setActiveTab("chat");
    setMobileView("detail");
    setUnreadByLead((prev) => ({ ...prev, [lead.id]: 0 }));
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

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !pendingFiles.length) || !selectedLead) return;
    setSendingMessage(true);
    try {
      let attachments: string[] = [];
      if (pendingFiles.length) {
        setUploadingFiles(true);
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        const up = await fetch("/api/cabinet/upload", { method: "POST", body: fd });
        if (up.ok) {
          const { results } = await up.json();
          attachments = results.map((r: { url: string }) => r.url);
        }
        setUploadingFiles(false);
      }
      const res = await fetch("/api/cabinet/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: selectedLead.id, body: messageInput.trim(), attachments }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const msg = await res.json();
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setMessageInput("");
      setPendingFiles([]);
    } catch (error) {
      toast.error(`Помилка при відправці: ${error instanceof Error ? error.message : "невідома"}`);
    } finally {
      setSendingMessage(false);
      setUploadingFiles(false);
    }
  };

  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel("client-cabinet-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: { new: Message }) => {
        const incoming = payload.new;
        const leadExists = leadsRef.current.some((lead) => lead.id === incoming.lead_id);
        if (!leadExists) return;

        if (incoming.sender === "manager") {
          playNotificationTone();
          toast.info(incoming.sender_email || "U:DO Manager", {
            description: incoming.body || "New message",
            style: { background: "#111", color: "#fff", borderColor: "#111" },
            action: {
              label: "Open",
              onClick: () => {
                const lead = leadsRef.current.find((l) => l.id === incoming.lead_id);
                if (lead) {
                  setSelectedLead(lead);
                  setMobileView("detail");
                }
                setActiveTab("chat");
              },
            },
          });
          const isOpenChatForLead =
            selectedLeadRef.current?.id === incoming.lead_id &&
            activeTabRef.current === "chat";
          if (isOpenChatForLead) {
            setUnreadByLead((prev) => ({ ...prev, [incoming.lead_id]: 0 }));
          } else {
            setUnreadByLead((prev) => ({
              ...prev,
              [incoming.lead_id]: (prev[incoming.lead_id] || 0) + 1,
            }));
          }
        }

        if (selectedLeadRef.current?.id === incoming.lead_id) {
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload: { new: Lead }) => {
        const incoming = payload.new;
        const email = incoming?.customer_data?.email;
        if (!email || email !== user?.email) return;
        setLeads((prev) => (prev.some((l) => l.id === incoming.id) ? prev : [incoming, ...prev]));
        playNotificationTone();
        toast.success("New order", {
          description: "A new order was created for your account.",
          style: { background: "#111", color: "#fff", borderColor: "#111" },
          action: {
            label: "Open",
            onClick: () => {
              setSelectedLead(incoming);
              setMobileView("detail");
              setActiveTab("details");
            },
          },
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, (payload: { new: Lead }) => {
        const incoming = payload.new;
        setLeads((prev) => {
          const previous = prev.find((lead) => lead.id === incoming.id);
          if (previous && previous.status !== incoming.status) {
            const statusLabel = STATUS_CONFIG[incoming.status]?.label || incoming.status;
            toast.info("Order updated", {
              description: `Status: ${statusLabel}`,
              style: { background: "#111", color: "#fff", borderColor: "#111" },
            });
          }
          return prev.map((lead) => (lead.id === incoming.id ? { ...lead, ...incoming } : lead));
        });
        if (selectedLead?.id === incoming.id) {
          setSelectedLead((prev) => (prev ? { ...prev, ...incoming } : prev));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads, supabase, user?.email]);

  // Fallback live polling when websocket updates are delayed/unavailable
  useEffect(() => {
    const interval = window.setInterval(async () => {
      const lead = selectedLeadRef.current;
      if (!lead) return;
      try {
        const res = await fetch(`/api/cabinet/messages?lead_id=${lead.id}`);
        if (!res.ok) return;
        const latest = (await res.json()) as Message[];
        const known = messageIdsRef.current;
        const freshFromManager = latest.filter((m) => !known.has(m.id) && m.sender === "manager");
        if (freshFromManager.length > 0) {
          playNotificationTone();
          const last = freshFromManager[freshFromManager.length - 1];
          toast.info(last.sender_email || "U:DO Manager", {
            description: last.body || "New message",
            style: { background: "#111", color: "#fff", borderColor: "#111" },
            action: {
              label: "Open",
              onClick: () => setActiveTab("chat"),
            },
          });
          const isOpenChatForLead =
            selectedLeadRef.current?.id === lead.id && activeTabRef.current === "chat";
          if (!isOpenChatForLead) {
            setUnreadByLead((prev) => ({
              ...prev,
              [lead.id]: (prev[lead.id] || 0) + freshFromManager.length,
            }));
          }
        }
        setMessages(latest);
      } catch {
        // noop
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  const handleDownloadInvoice = async () => {
    if (!selectedLead || !user) return;
    setGeneratingPdf(true);
    try {
      const totalQty = selectedLead.order_items?.reduce((s, i) => s + i.quantity, 0) || 1;
      await generateInvoicePDF({
        items: (selectedLead.order_items || []).map((item) => ({
          productName: `Товар (${item.color})`,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          // Use stored unit_price_cents when available; fall back to estimation for legacy items
          unitPriceCents: item.unit_price_cents != null
            ? item.unit_price_cents
            : Math.round(selectedLead.total_amount_cents / Math.max(1, totalQty)),
          printUrl: item.custom_print_url,
        })),
        contact: {
          name: selectedLead.customer_data.name,
          email: selectedLead.customer_data.email,
          phone: selectedLead.customer_data.phone || "",
          company: selectedLead.customer_data.company,
        },
        createdAt: new Date(selectedLead.created_at),
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading || !user) {
    return <SimpleLoader />;
  }

  const statusCfg = selectedLead ? statusLabels[selectedLead.status] ?? statusLabels.new : null;
  const StatusIcon = statusCfg?.icon ?? Clock;
  const unreadCurrentLead = selectedLead ? (unreadByLead[selectedLead.id] || 0) : 0;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      {viewerUrl && <FileViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}

      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {mobileView === "detail" && (
            <button onClick={() => setMobileView("list")} className="md:hidden text-muted-foreground hover:text-foreground transition-colors mr-1">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <Link href="/" aria-label="U:DO CRAFT">
            <BrandLogoFull className="h-6 w-auto text-primary" color="var(--color-primary, #1B18AC)" />
          </Link>
          <span className="text-muted-foreground text-sm hidden sm:block">{t("breadcrumb")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[180px]">{user.email}</span>
          <Link href="/cabinet/settings" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="size-4" />
            <span className="hidden sm:block">{t("settings")}</span>
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="size-4" />
            <span className="hidden sm:block">{t("logout")}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Lead list ── */}
        <div className={`w-72 shrink-0 flex flex-col border-r border-border bg-card ${mobileView === "detail" ? "hidden md:flex" : "flex"}`}>
          <div className="flex-1 overflow-y-auto">
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
                <Package className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
                <Link href="/"><Button variant="outline" size="sm">{t("toCatalog")}</Button></Link>
              </div>
            ) : leads.map((lead) => {
              const cfg = statusLabels[lead.status] ?? statusLabels.new;
              const isActive = selectedLead?.id === lead.id;
              const unread = unreadByLead[lead.id] || 0;
              return (
                <button key={lead.id} onClick={() => handleSelectLead(lead)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                    isActive ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50"
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1">
                      {lead.customer_data.company || lead.customer_data.name}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {new Date(lead.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    <div className="flex items-center gap-1.5">
                      {unread > 0 && <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded-full">+{unread}</span>}
                      {lead.total_amount_cents > 0 && <span className="text-xs font-semibold">{(lead.total_amount_cents / 100).toFixed(0)} ₴</span>}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleChatShortcut(lead); }}
                        aria-label={t("writeTo")}
                        title={t("writeTo")}
                        className="relative flex items-center justify-center size-6 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <MessageCircle className="size-3.5" />
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] bg-red-500 text-white font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center leading-none">
                            {unread}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat area ── */}
        {selectedLead ? (
          <div className={`flex-1 flex overflow-hidden ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
            <div className="flex-1 flex flex-col overflow-hidden bg-background">

              {/* Chat header */}
              <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{(selectedLead.customer_data.company || selectedLead.customer_data.name)?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{selectedLead.customer_data.company || selectedLead.customer_data.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedLead.customer_data.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg?.color}`}>
                    <StatusIcon className="size-3" />
                    {statusCfg?.label}
                  </span>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-border shrink-0 bg-card">
                {(["details", "chat", "files"] as const).map((tab) => {
                  const labels = { details: t("tabs.details"), chat: t("tabs.chat"), files: t("tabs.files") };
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {labels[tab]}
                      {tab === "chat" && unreadCurrentLead > 0 && (
                        <span className="ml-1.5 text-[10px] bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded-full">
                          {unreadCurrentLead}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content — Details */}
              {activeTab === "details" && (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center py-6 px-4 border-b border-border">
                    <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                      <span className="text-2xl font-bold text-primary">{(selectedLead.customer_data.company || selectedLead.customer_data.name)?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <p className="font-semibold text-base text-center">{selectedLead.customer_data.company || selectedLead.customer_data.name}</p>
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium mt-1.5 ${statusCfg?.color}`}>
                      <StatusIcon className="size-3" />{statusCfg?.label}
                    </span>
                  </div>
                  <div className="px-4 py-4 space-y-3 border-b border-border">
                    {selectedLead.customer_data.phone && (
                      <div className="flex items-start gap-3"><Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{selectedLead.customer_data.phone}</p><p className="text-xs text-muted-foreground">{t("details.phone")}</p></div></div>
                    )}
                    <div className="flex items-start gap-3"><Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm break-all">{selectedLead.customer_data.email}</p><p className="text-xs text-muted-foreground">{t("details.email")}</p></div></div>
                    {selectedLead.customer_data.company && (
                      <div className="flex items-start gap-3"><Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{selectedLead.customer_data.company}</p><p className="text-xs text-muted-foreground">{t("details.company")}</p></div></div>
                    )}
                    <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{new Date(selectedLead.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-xs text-muted-foreground">{t("details.orderDate")}</p></div></div>
                    {selectedLead.total_amount_cents > 0 && (
                      <div className="flex items-start gap-3"><FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm font-medium">₴{(selectedLead.total_amount_cents / 100).toFixed(0)}</p><p className="text-xs text-muted-foreground">{t("details.orderAmount")}</p></div></div>
                    )}
                    {selectedLead.customer_data.delivery && (
                      <div className="flex items-start gap-3"><Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{deliveryLabels[selectedLead.customer_data.delivery] ?? selectedLead.customer_data.delivery}</p><p className="text-xs text-muted-foreground">{t("details.delivery")}</p></div></div>
                    )}
                    {selectedLead.customer_data.deadline && (
                      <div className="flex items-start gap-3"><Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-sm">{new Date(selectedLead.customer_data.deadline).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{t("details.deadline")}</p></div></div>
                    )}
                  </div>
                  {selectedLead.order_items && selectedLead.order_items.length > 0 && (
                    <div className="px-4 py-4 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("details.positions", { n: selectedLead.order_items.length })}</p>
                      <div className="space-y-3">
                        {selectedLead.order_items.map((item) => (
                          <div key={item.id} className="flex gap-3 items-start">
                            {item.mockup_url
                              ? <img src={item.mockup_url} alt="" className="w-12 h-12 rounded-md object-cover border border-border shrink-0" />
                              : <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-muted-foreground" /></div>}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{item.color} / {item.size}</p>
                              <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                              {item.custom_print_url && (
                                <button onClick={() => setViewerUrl(item.custom_print_url!)} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                                  <ExternalLink className="w-3 h-3" /> {t("details.print")}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedLead.customer_data.attachments?.length ? (
                    <div className="px-4 py-4 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("details.attachments", { n: selectedLead.customer_data.attachments.length })}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedLead.customer_data.attachments.map((url, i) =>
                          isImage(url) ? (
                            <button key={i} onClick={() => setViewerUrl(url)}><img src={url} alt="" className="w-full aspect-square object-cover rounded-md border border-border hover:opacity-80 transition-opacity" /></button>
                          ) : (
                            <button key={i} onClick={() => setViewerUrl(url)} className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted transition-colors text-xs text-primary truncate"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">File {i + 1}</span></button>
                          )
                        )}
                      </div>
                    </div>
                  ) : null}
                  <div className="px-4 py-4">
                    <Button variant="outline" className="w-full" onClick={handleDownloadInvoice} disabled={generatingPdf}>
                      {generatingPdf ? <Loader2 className="size-4 animate-spin mr-2" /> : <Download className="size-4 mr-2" />}
                      {generatingPdf ? t("details.positions", { n: "" }) : t("details.invoice")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab content — Chat */}
              {activeTab === "chat" && (
                <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {selectedLead.customer_data?.message && (
                      <div className="flex justify-start">
                        <div className="max-w-sm bg-muted rounded-2xl rounded-bl-sm p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t("chat.empty")}</p>
                          <p className="text-sm">{selectedLead.customer_data.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(selectedLead.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    {messages.length === 0 && !selectedLead.customer_data?.message && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageCircle className="size-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">{t("chat.empty")}</p>
                      </div>
                    )}
                    {messages.map((msg) => {
                      const isClient = msg.sender === "client";
                      return (
                        <div key={msg.id} className={`flex flex-col gap-0.5 ${isClient ? "items-end" : "items-start"}`}>
                          <div className={`flex items-end gap-1.5 ${isClient ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`max-w-xs sm:max-w-sm rounded-2xl px-3.5 py-2.5 ${isClient ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                              {msg.body && <p className="text-sm leading-relaxed break-words">{msg.body}</p>}
                              {msg.attachments?.length ? (
                                <div className={`grid gap-1.5 mt-1.5 ${msg.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                                  {msg.attachments.map((url, i) =>
                                    isImage(url) ? (
                                      <button key={i} onClick={() => setViewerUrl(url)} className="block">
                                        <img src={url} alt="" className="rounded-xl max-w-[150px] sm:max-w-[200px] w-full object-cover hover:opacity-90 transition-opacity cursor-zoom-in" />
                                      </button>
                                    ) : isVideo(url) ? (
                                      <button key={i} onClick={() => setViewerUrl(url)} className="block relative">
                                        <video src={url} className="rounded-xl max-w-[150px] sm:max-w-[200px] w-full object-cover" muted />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                                            <span className="text-white text-xs ml-0.5">▶</span>
                                          </div>
                                        </div>
                                      </button>
                                    ) : (
                                      <button key={i} onClick={() => setViewerUrl(url)}
                                        className={`flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg border ${isClient ? "border-primary-foreground/20 text-primary-foreground/80 hover:bg-primary-foreground/10" : "border-border text-foreground hover:bg-background"} transition-colors`}>
                                        <FileText className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Файл").slice(0, 20)}</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 pb-0.5 flex items-center gap-0.5">
                              {fmtTime(msg.created_at)}
                              {isClient && (
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

              {/* Input bar */}
              <div className="border-t border-border px-3 sm:px-4 py-2 sm:py-3 shrink-0 bg-card space-y-2">
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1 overflow-x-auto">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="relative group flex-shrink-0">
                        {uploadingFiles ? (
                          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-border overflow-hidden bg-muted flex items-end justify-center gap-[3px] pb-2">
                            {[0, 1, 2, 3].map((j) => (
                              <span key={j} className="w-1 rounded-full bg-primary/40 animate-pulse"
                                style={{ height: `${28 + j * 6}px`, animationDelay: `${j * 0.12}s` }} />
                            ))}
                          </div>
                        ) : f.type.startsWith("image/") ? (
                          <img src={URL.createObjectURL(f)} alt={f.name} className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-xl border border-border" />
                        ) : f.type.startsWith("video/") ? (
                          <video src={URL.createObjectURL(f)} className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-xl border border-border" muted />
                        ) : (
                          <div className="h-14 w-24 sm:h-16 sm:w-28 flex items-center gap-2 px-2.5 rounded-xl border border-border bg-muted">
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-muted-foreground" />
                            <span className="text-xs text-foreground truncate leading-tight">{f.name}</span>
                          </div>
                        )}
                        {!uploadingFiles && (
                          <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-destructive hover:border-destructive hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <label className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                    <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.svg,.ai,.eps,.psd,.zip,.rar,.7z,.tar,.gz" className="hidden"
                      onChange={(e) => { addFiles(e.target.files ? Array.from(e.target.files) : []); e.target.value = ""; }} />
                    <Paperclip className="size-4" />
                  </label>
                  <Input placeholder="Напишіть повідомлення..." value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    onPaste={handlePaste}
                    disabled={sendingMessage} className="flex-1 text-sm" />
                  <Button size="icon" onClick={handleSendMessage}
                    disabled={sendingMessage || uploadingFiles || (!messageInput.trim() && !pendingFiles.length)}>
                    {sendingMessage || uploadingFiles ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </div>
                </>
              )}

              {/* Tab content — Files */}
              {activeTab === "files" && (
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {orderFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <FolderOpen className="size-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Файли відсутні</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {orderFiles.map((url, i) =>
                        isImage(url) ? (
                          <button key={i} onClick={() => setViewerUrl(url)} className="block aspect-square rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <button key={i} onClick={() => setViewerUrl(url)}
                            className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-md border border-border bg-muted hover:bg-muted/70 transition-colors p-2">
                            <FileText className="w-6 h-6 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight">
                              {decodeURIComponent(url.split("/").pop()?.split("?")[0] || "Файл")}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`flex-1 flex items-center justify-center bg-muted/20 ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
            <div className="text-center">
              <MessageCircle className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Виберіть замовлення зліва</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
