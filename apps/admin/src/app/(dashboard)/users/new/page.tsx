"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormPage } from "@/components/page-templates";
import { RolePicker } from "../_components/RolePicker";
import { type Role, errMsg, usersApi } from "../_components/user-utils";

export default function InviteUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<{ email: string; full_name: string; role: Role }>({ email: "", full_name: "", role: "viewer" });
  const [saving, setSaving] = useState(false);

  return (
    <FormPage
      title="Запросити користувача"
      subtitle="Надішлемо посилання для реєстрації"
      backHref="/users"
      breadcrumbs={[{ label: "Користувачі", href: "/users" }, { label: "Запрошення" }]}
      submitLabel="Надіслати запрошення"
      submitting={saving}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.email) return toast.error("Введіть email");
        setSaving(true);
        try {
          await usersApi("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
          toast.success(`Запрошення надіслано на ${form.email}`);
          router.push("/users");
        } catch (err) {
          toast.error(errMsg(err));
          setSaving(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" type="email" autoComplete="off" placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-name">Ім&apos;я</Label>
        <Input id="invite-name" placeholder="Ім'я Прізвище" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Роль</Label>
        <RolePicker value={form.role} onChange={(role) => setForm({ ...form, role })} />
      </div>
    </FormPage>
  );
}
