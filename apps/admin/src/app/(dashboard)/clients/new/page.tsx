"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormPage } from "@/components/page-templates";
import { ClientFormFields, EMPTY_CLIENT, clientHref } from "../_lib/clients";

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [saving, setSaving] = useState(false);

  return (
    <FormPage
      title="Новий клієнт"
      backHref="/clients"
      breadcrumbs={[{ label: "Клієнти", href: "/clients" }, { label: "Новий" }]}
      submitLabel="Додати"
      submitting={saving}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.phone) return toast.error("Ім'я, email та телефон обов'язкові");
        setSaving(true);
        try {
          const res = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "new",
              customer_data: { name: form.name, email: form.email, phone: form.phone || undefined, company: form.company || undefined, social_channel: form.social_channel || undefined },
              total_amount_cents: 0,
            }),
          });
          if (!res.ok) throw new Error((await res.json()).error || "Помилка");
          toast.success("Клієнта додано");
          router.push(clientHref(form.email));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Помилка");
          setSaving(false);
        }
      }}
    >
      <ClientFormFields form={form} onChange={setForm} />
    </FormPage>
  );
}
