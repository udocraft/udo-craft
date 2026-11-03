"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LeadStatus } from "@/components/status-badge";

export interface OrderItem {
  id: string;
  color: string;
  size: string;
  quantity: number;
  mockup_url?: string;
  custom_print_url?: string;
}

export interface Lead {
  id: string;
  status: LeadStatus;
  customer_data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    social_channel?: string;
    keycrm_id?: number | string;
    keycrm_client_id?: number | string;
    keycrm_payment_status?: string;
    keycrm_payments_total_cents?: number;
    keycrm_manager_name?: string;
    keycrm_recipient_name?: string;
  };
  total_amount_cents: number;
  created_at: string;
  order_items?: OrderItem[];
}

/** Clients are not stored: they are leads grouped by KeyCRM client id, else by email. */
export interface ClientRecord {
  key: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  social_channel?: string;
  leads: Lead[];
  totalSpent: number;
  paidTotal: number;
  ordersCount: number;
  keycrmOrders: number;
  lastOrderAt: string;
  lastManager?: string;
}

export interface ClientForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  social_channel: string;
}

export const EMPTY_CLIENT: ClientForm = { name: "", email: "", phone: "", company: "", social_channel: "" };

export const clientHref = (key: string) => `/clients/${encodeURIComponent(key)}`;

export function groupClients(leads: Lead[]): ClientRecord[] {
  const map = new Map<string, ClientRecord>();
  for (const lead of leads) {
    const email = lead.customer_data?.email?.trim() || "";
    const keycrmClientId = lead.customer_data?.keycrm_client_id;
    const key = keycrmClientId ? `keycrm:${keycrmClientId}` : email || `__noemail__${lead.id}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        email,
        name: lead.customer_data?.name || email || "Невідомий",
        phone: lead.customer_data?.phone,
        company: lead.customer_data?.company,
        social_channel: lead.customer_data?.social_channel,
        leads: [],
        totalSpent: 0,
        paidTotal: 0,
        ordersCount: 0,
        keycrmOrders: 0,
        lastOrderAt: lead.created_at,
        lastManager: lead.customer_data?.keycrm_manager_name,
      });
    }
    const rec = map.get(key)!;
    rec.leads.push(lead);
    rec.totalSpent += lead.total_amount_cents;
    rec.paidTotal += lead.customer_data?.keycrm_payments_total_cents ?? 0;
    rec.ordersCount += 1;
    if (lead.customer_data?.keycrm_id) rec.keycrmOrders += 1;
    if (lead.customer_data?.keycrm_manager_name) rec.lastManager = lead.customer_data.keycrm_manager_name;
    if (lead.created_at > rec.lastOrderAt) rec.lastOrderAt = lead.created_at;
  }
  return Array.from(map.values());
}

export function useClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await createClient().from("leads").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Помилка завантаження клієнтів");
    else setClients(groupClients((data || []) as Lead[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { clients, loading, reload };
}

export async function deleteClient(client: ClientRecord) {
  await Promise.all(client.leads.map((l) => fetch(`/api/leads/${l.id}`, { method: "DELETE" })));
}

export function ClientFormFields({ form, onChange }: { form: ClientForm; onChange: (f: ClientForm) => void }) {
  const field = (key: keyof ClientForm, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={form[key]} onChange={(e) => onChange({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">{field("name", "Ім'я та прізвище *", { placeholder: "Іван Петренко" })}</div>
      <div className="sm:col-span-2">{field("email", "Email *", { type: "email", placeholder: "hr@company.com" })}</div>
      {field("phone", "Телефон", { type: "tel", placeholder: "+380..." })}
      {field("company", "Компанія", { placeholder: "ТОВ Назва" })}
      <div className="sm:col-span-2">{field("social_channel", "Telegram / Instagram", { placeholder: "@username" })}</div>
    </div>
  );
}
