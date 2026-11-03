"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { enableNotificationAudio, playNotificationTone } from "@/lib/notifications";

export interface OrderItem {
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

export type LeadStatus = "new" | "in_progress" | "production" | "completed" | "archived";

export interface Lead {
  id: string;
  status: LeadStatus;
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

export interface Message {
  id: string;
  lead_id: string;
  body: string;
  sender: "client" | "manager";
  sender_email?: string;
  created_at: string;
  read_at?: string | null;
  attachments?: string[];
}

/** Order progress as shown on the tracking timeline. `archived` counts as finished. */
export const PROGRESS_STEPS: LeadStatus[] = ["new", "in_progress", "production", "completed"];

const STATUS_STYLE: Record<LeadStatus, { color: string; icon: React.ElementType }> = {
  new: { color: "bg-blue-100 text-blue-700", icon: Clock },
  in_progress: { color: "bg-amber-100 text-amber-700", icon: Clock },
  production: { color: "bg-violet-100 text-violet-700", icon: Package },
  completed: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  archived: { color: "bg-gray-100 text-gray-600", icon: Package },
};

export function useStatusConfig() {
  const t = useTranslations("cabinet");
  return (status: string) => {
    const key = (status in STATUS_STYLE ? status : "new") as LeadStatus;
    return { ...STATUS_STYLE[key], label: t(`status.${key}`) };
  };
}

type MessageListener = (message: Message) => void;

interface CabinetContextValue {
  user: { email: string; id: string };
  leads: Lead[];
  loading: boolean;
  unreadByLead: Record<string, number>;
  totalUnread: number;
  addUnread: (leadId: string, n: number) => void;
  markRead: (leadId: string) => void;
  /** Tell the provider which chat is on screen so it does not count or toast for it. */
  setActiveChat: (leadId: string | null) => void;
  subscribeMessages: (listener: MessageListener) => () => void;
  logout: () => Promise<void>;
}

const CabinetContext = createContext<CabinetContextValue | null>(null);

export function useCabinet() {
  const ctx = useContext(CabinetContext);
  if (!ctx) throw new Error("useCabinet must be used inside CabinetProvider");
  return ctx;
}

const TOAST_STYLE = { background: "#111", color: "#fff", borderColor: "#111" };

export function CabinetProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const statusConfig = useStatusConfig();
  const statusConfigRef = useRef(statusConfig);
  statusConfigRef.current = statusConfig;

  const [user, setUser] = useState<{ email: string; id: string } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadByLead, setUnreadByLead] = useState<Record<string, number>>({});
  const leadsRef = useRef<Lead[]>([]);
  const activeChatRef = useRef<string | null>(null);
  const listeners = useRef(new Set<MessageListener>());

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: User | null } }) => {
      const authUser = res.data.user;
      if (!authUser) router.push("/cabinet/login");
      else setUser({ email: authUser.email!, id: authUser.id });
    });
  }, [supabase, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await fetch("/api/cabinet/leads");
      if (res.status === 401) {
        router.push("/cabinet/login");
        return;
      }
      setLeads((await res.json()) || []);
      setLoading(false);
    })();
  }, [user, router]);

  useEffect(() => {
    const unlock = () => enableNotificationAudio();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const addUnread = useCallback((leadId: string, n: number) => {
    setUnreadByLead((prev) => ({ ...prev, [leadId]: (prev[leadId] || 0) + n }));
  }, []);
  const markRead = useCallback((leadId: string) => {
    setUnreadByLead((prev) => (prev[leadId] ? { ...prev, [leadId]: 0 } : prev));
  }, []);
  const setActiveChat = useCallback((leadId: string | null) => {
    activeChatRef.current = leadId;
  }, []);
  const subscribeMessages = useCallback((listener: MessageListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    const channel = supabase
      .channel("client-cabinet-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: { new: Message }) => {
        const incoming = payload.new;
        if (!leadsRef.current.some((l) => l.id === incoming.lead_id)) return;
        if (incoming.sender === "manager" && activeChatRef.current !== incoming.lead_id) {
          playNotificationTone();
          addUnread(incoming.lead_id, 1);
          toast.info(incoming.sender_email || "U:DO Manager", {
            description: incoming.body || "New message",
            style: TOAST_STYLE,
            action: { label: "Open", onClick: () => router.push(`/cabinet/orders/${incoming.lead_id}?tab=chat`) },
          });
        }
        listeners.current.forEach((fn) => fn(incoming));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload: { new: Lead }) => {
        const incoming = payload.new;
        if (!incoming?.customer_data?.email || incoming.customer_data.email !== user.email) return;
        setLeads((prev) => (prev.some((l) => l.id === incoming.id) ? prev : [incoming, ...prev]));
        playNotificationTone();
        toast.success("New order", {
          description: "A new order was created for your account.",
          style: TOAST_STYLE,
          action: { label: "Open", onClick: () => router.push(`/cabinet/orders/${incoming.id}`) },
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, (payload: { new: Lead }) => {
        const incoming = payload.new;
        const previous = leadsRef.current.find((l) => l.id === incoming.id);
        if (previous && previous.status !== incoming.status) {
          toast.info("Order updated", { description: `Status: ${statusConfigRef.current(incoming.status).label}`, style: TOAST_STYLE });
        }
        setLeads((prev) => prev.map((l) => (l.id === incoming.id ? { ...l, ...incoming } : l)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.email, router, addUnread]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/");
  }, [supabase, router]);

  const totalUnread = useMemo(() => Object.values(unreadByLead).reduce((a, b) => a + b, 0), [unreadByLead]);

  if (!user) return <>{fallback}</>;

  return (
    <CabinetContext.Provider value={{ user, leads, loading, unreadByLead, totalUnread, addUnread, markRead, setActiveChat, subscribeMessages, logout }}>
      {children}
    </CabinetContext.Provider>
  );
}
