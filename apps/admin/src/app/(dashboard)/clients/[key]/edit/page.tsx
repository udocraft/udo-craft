"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormPage } from "@/components/page-templates";
import { ClientFormFields, type ClientForm, clientHref, useClients } from "../../_lib/clients";

export default function EditClientPage({ params }: { params: Promise<{ key: string }> }) {
  const { key: rawKey } = use(params);
  const key = decodeURIComponent(rawKey);
  const router = useRouter();
  const { clients, loading } = useClients();
  const [draft, setDraft] = useState<ClientForm | null>(null);
  const [saving, setSaving] = useState(false);

  const client = clients.find((c) => c.key === key);
  const form = draft ?? (client ? { name: client.name, email: client.email, phone: client.phone ?? "", company: client.company ?? "", social_channel: client.social_channel ?? "" } : null);
  const backHref = clientHref(key);

  if (loading || !client || !form) {
    return (
      <FormPage title="Редагувати клієнта" backHref={backHref} onSubmit={(e) => e.preventDefault()} submitting>
        <p className="text-sm text-muted-foreground">{loading ? "Завантаження..." : "Клієнта не знайдено"}</p>
      </FormPage>
    );
  }

  return (
    <FormPage
      title="Редагувати клієнта"
      subtitle="Зміни застосуються до всіх замовлень клієнта"
      backHref={backHref}
      breadcrumbs={[{ label: "Клієнти", href: "/clients" }, { label: client.name, href: backHref }, { label: "Редагування" }]}
      submitting={saving}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) return toast.error("Ім'я та email обов'язкові");
        setSaving(true);
        try {
          await Promise.all(client.leads.map((lead) =>
            fetch(`/api/leads/${lead.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customer_data: {
                  ...lead.customer_data,
                  name: form.name.trim(),
                  email: form.email.trim(),
                  phone: form.phone.trim() || undefined,
                  company: form.company.trim() || undefined,
                  social_channel: form.social_channel.trim() || undefined,
                },
              }),
            }).then(async (res) => {
              if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Помилка збереження");
            }),
          ));
          toast.success("Клієнта оновлено");
          // The grouping key can change with the email, so go via the list.
          router.push(client.key.startsWith("keycrm:") ? backHref : clientHref(form.email.trim()));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Помилка збереження");
          setSaving(false);
        }
      }}
    >
      <ClientFormFields form={form} onChange={setDraft} />
    </FormPage>
  );
}
