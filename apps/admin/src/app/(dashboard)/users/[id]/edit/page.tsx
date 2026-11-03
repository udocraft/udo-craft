"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormPage } from "@/components/page-templates";
import { RolePicker } from "../../_components/RolePicker";
import { useUsers } from "../../_components/useUsers";
import { type Role, errMsg, toEditable, usersApi } from "../../_components/user-utils";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { users, loading } = useUsers();
  const [draft, setDraft] = useState<{ full_name: string; role: Role } | null>(null);
  const [saving, setSaving] = useState(false);

  const user = users.find((u) => u.id === id);
  const editable = user ? toEditable(user) : null;
  const form = draft ?? (editable ? { full_name: editable.full_name, role: (editable.role || "viewer") as Role } : null);
  const backHref = `/users/${id}`;

  if (loading || !form) {
    return (
      <FormPage title="Редагувати користувача" backHref={backHref} onSubmit={(e) => e.preventDefault()} submitting>
        <p className="text-sm text-muted-foreground">{loading ? "Завантаження..." : "Користувача не знайдено"}</p>
      </FormPage>
    );
  }

  return (
    <FormPage
      title="Редагувати користувача"
      subtitle={user?.email}
      backHref={backHref}
      breadcrumbs={[{ label: "Користувачі", href: "/users" }, { label: user?.full_name || user?.email || "Користувач", href: backHref }, { label: "Редагування" }]}
      submitting={saving}
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await usersApi(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
          toast.success("Оновлено");
          router.push(backHref);
        } catch (err) {
          toast.error(errMsg(err));
          setSaving(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="user-name">Ім&apos;я</Label>
        <Input id="user-name" value={form.full_name} placeholder="Ім'я Прізвище" onChange={(e) => setDraft({ ...form, full_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Роль</Label>
        <RolePicker value={form.role} onChange={(role) => setDraft({ ...form, role })} />
      </div>
    </FormPage>
  );
}
