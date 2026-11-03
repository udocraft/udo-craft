"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Loader2, Mail, Shield, ShoppingBag, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@udo-craft/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { InfoRow, StatRow } from "@/components/detail-bits";
import { DetailPage } from "@/components/page-templates";
import { useUsers } from "../_components/useUsers";
import { STAGE_BADGE, STAGE_LABELS, errMsg, fmtDate, fmtMoney, initials, stageLabel, usersApi } from "../_components/user-utils";

export default function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { users, loading } = useUsers();
  const [deleting, setDeleting] = useState(false);
  const user = users.find((u) => u.id === id);

  if (loading || !user) {
    return (
      <DetailPage title={loading ? "Користувач" : "Користувача не знайдено"} backHref="/users">
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : <p className="text-sm text-muted-foreground">Можливо, його вже видалено.</p>}
      </DetailPage>
    );
  }

  const remove = async () => {
    if (!confirm(`Видалити ${user.email} назавжди?`)) return;
    setDeleting(true);
    try {
      await usersApi(`/api/users/${user.id}`, { method: "DELETE" });
      toast.success("Видалено");
      router.push("/users");
    } catch (e) {
      toast.error(errMsg(e));
      setDeleting(false);
    }
  };

  const lastActive = user.last_customer_activity_at || user.last_sign_in_at;

  return (
    <DetailPage
      title={user.full_name || "Без імені"}
      subtitle={user.email}
      status={<Badge variant={STAGE_BADGE[user.lifecycle_stage]}>{stageLabel(user)}</Badge>}
      backHref="/users"
      breadcrumbs={[{ label: "Користувачі", href: "/users" }, { label: user.full_name || user.email }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={remove} disabled={deleting}>Видалити</Button>
          <Button size="sm" nativeButton={false} render={<Link href={`/users/${user.id}/edit`} />}>Редагувати</Button>
        </>
      }
    >
      <StatRow stats={[
        { label: "Замовлень", value: String(user.order_count || 0) },
        { label: "Зареєстрований", value: fmtDate(user.created_at) },
        { label: "Статус", value: user.confirmed ? "Активний" : "Запрошений", positive: user.confirmed },
      ]} />
      <AdminSection title="Профіль">
        <AdminTablePanel className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0 rounded-full">
              <AvatarImage src={user.avatar_url} alt="" />
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{initials(user.full_name, user.email)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.full_name || "Без імені"}</span>
          </div>
          <InfoRow icon={Mail} value={user.email} href={`mailto:${user.email}`} />
          {user.order_count > 0 && <InfoRow icon={ShoppingBag} value={`${user.order_count} замовлень · ${fmtMoney(user.lifetime_value_cents)}`} />}
          <InfoRow icon={Calendar} value={fmtDate(user.created_at)} label="Реєстрація" />
          {lastActive && <InfoRow icon={Clock} value={fmtDate(lastActive)} label="Остання активність" />}
          <InfoRow icon={user.lifecycle_stage === "internal_staff" ? Shield : User} value={STAGE_LABELS[user.lifecycle_stage]} label="Сегмент" />
        </AdminTablePanel>
      </AdminSection>
    </DetailPage>
  );
}
