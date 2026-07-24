"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminToolbar, AdminTablePanel, AdminTabs } from "@/components/admin-layout";
import { UserPlus, Pencil, Trash2, RefreshCw, Loader2, Search, Mail, Calendar, Shield, Eye, Scissors, User, ShoppingBag, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "admin" | "manager" | "viewer" | "sewer" | "seamstress";
type LifecycleStage = "registered_lead" | "client" | "internal_staff";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: Role | "";
  access_role: Role | null;
  lifecycle_stage: LifecycleStage;
  order_count: number;
  lifetime_value_cents: number;
  last_customer_activity_at: string | null;
  avatar_url: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
}

const ROLES: { value: Exclude<Role, "seamstress">; label: string }[] = [
  { value: "admin",   label: "Адмін" },
  { value: "manager", label: "Менеджер" },
  { value: "sewer", label: "Швея" },
  { value: "viewer", label: "Перегляд" },
];

const TABS = [
  { key: "all", label: "Всі" },
  { key: "admin", label: "Адміни" },
  { key: "manager", label: "Менеджери" },
  { key: "sewer", label: "Швеї" },
  { key: "viewer", label: "Перегляд" },
] as const;

function normalizeRole(role: Role) {
  return role === "seamstress" ? "sewer" : role;
}

const STAGE_LABELS: Record<LifecycleStage, string> = {
  registered_lead: "Зареєстрований лід",
  client: "Клієнт",
  internal_staff: "Команда",
};

function stageLabel(user: AdminUser) {
  const role = user.access_role ? ROLES.find(r => r.value === normalizeRole(user.access_role as Role))?.label : null;
  return role || STAGE_LABELS[user.lifecycle_stage];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "short" });
}

function initials(name: string, email: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return email.charAt(0).toUpperCase();
}

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  manager: User,
  sewer: Scissors,
  viewer: Eye,
};

function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ROLES.map((r) => {
        const Icon = ROLE_ICONS[r.value] || User;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange(r.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              value === r.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-white text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

const EMPTY_FORM = { email: "", full_name: "", role: "viewer" as Role };

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFilter = (searchParams.get("role") || "all") as Role | "all";
  const filter = rawFilter === "seamstress" ? "sewer" : rawFilter;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    const matchesRole = filter === "all" || normalizeRole((u.access_role || "") as Role) === filter;
    const matchesSearch = !search || [u.full_name, u.email].some(v => String(v || "").toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const handleInvite = async () => {
    if (!form.email) { toast.error("Введіть email"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
      toast.success(`Запрошення надіслано на ${form.email}`);
      setInviteOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: selectedUser.full_name, role: selectedUser.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Оновлено");
      setSelectedUser(null);
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Видалено");
      setDeleteUser(null);
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Помилка");
    }
  };

  return (
    <DashboardPage
      title="Користувачі"
      titleAccessory={<AdminTabs tabs={TABS} value={filter} onValueChange={(next) => router.push(`/users?role=${next}`)} />}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={load} disabled={loading}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
          <Button size="sm" className="h-8 gap-2" onClick={() => { setForm(EMPTY_FORM); setInviteOpen(true); }}>
            <UserPlus className="size-3.5" />
            Запросити
          </Button>
        </div>
      }
    >
      <AdminToolbar>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 bg-muted/40 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Швидкий пошук..."
          />
        </div>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {filtered.length} користувачів
        </span>
      </AdminToolbar>

      <AdminTablePanel>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Користувач</TableHead>
                <TableHead>Сегмент</TableHead>
                <TableHead className="hidden lg:table-cell">Замовлення</TableHead>
                <TableHead className="hidden md:table-cell">Зареєстрований</TableHead>
                <TableHead className="hidden md:table-cell">Активність</TableHead>
                <TableHead className="hidden sm:table-cell">Статус</TableHead>
                <TableHead className="w-16"><span className="sr-only">Дії</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Немає користувачів
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((u) => (
                <TableRow
                  key={u.id}
                  className={cn("cursor-pointer", selectedUser?.id === u.id && "bg-muted/60")}
                  onClick={() => setSelectedUser({ ...u, role: normalizeRole((u.access_role || "viewer") as Role) })}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 rounded-lg shrink-0">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                          {initials(u.full_name, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{u.full_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium",
                      u.lifecycle_stage === "client" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      u.lifecycle_stage === "registered_lead" && "border-sky-200 bg-sky-50 text-sky-700",
                      u.lifecycle_stage === "internal_staff" && "border-violet-200 bg-violet-50 text-violet-700"
                    )}>
                      {stageLabel(u)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {u.order_count ? `${u.order_count} · ${Math.round(u.lifetime_value_cents / 100).toLocaleString("uk-UA")} ₴` : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{fmtDate(u.last_customer_activity_at || u.last_sign_in_at)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {u.confirmed ? "Активний" : "Запрошений"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setSelectedUser({ ...u, role: normalizeRole((u.access_role || "viewer") as Role) })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteUser(u)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminTablePanel>

      {/* ── User detail / invite sheet ── */}
      <Sheet
        open={inviteOpen || !!selectedUser}
        onOpenChange={(open) => { if (!open) { setInviteOpen(false); setSelectedUser(null); } }}
      >
        <SheetContent side="right" className="w-[380px] max-w-full p-0 flex flex-col gap-0 overflow-hidden bg-white" showCloseButton={false}>
          {inviteOpen ? (
            /* ── Invite panel ── */
            <>
              <SheetHeader className="flex-row items-start justify-between px-5 pt-5 pb-4 gap-3 shrink-0">
                <div>
                  <SheetTitle className="text-base font-bold">Запросити користувача</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Надішлемо посилання для реєстрації</p>
                </div>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground shrink-0" onClick={() => setInviteOpen(false)}>
                  ×
                </Button>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-5 py-2 space-y-5">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase">EMAIL</p>
                  <Input type="email" placeholder="user@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase">ІМ&apos;Я</p>
                  <Input placeholder="Ім'я Прізвище" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="h-10" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase">РОЛЬ</p>
                  <RolePicker value={form.role} onChange={(r) => setForm((f) => ({ ...f, role: r }))} />
                </div>
              </div>
              <div className="px-5 pb-5 pt-3 border-t shrink-0">
                <Button className="w-full h-10 gap-2" onClick={handleInvite} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  Надіслати запрошення
                </Button>
              </div>
            </>
          ) : selectedUser ? (
            /* ── Edit user panel ── */
            <>
              <SheetHeader className="flex-row items-start justify-between px-5 pt-5 pb-4 gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10 rounded-full shrink-0">
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {initials(selectedUser.full_name, selectedUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="text-base font-bold truncate">{selectedUser.full_name || "Без імені"}</SheetTitle>
                    <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={() => { setDeleteUser(selectedUser); setSelectedUser(null); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setSelectedUser(null)}>
                    ×
                  </Button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                {/* Stats bar */}
                <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
                  <UserStatTile label="Замовлень" value={String(selectedUser.order_count || 0)} />
                  <UserStatTile label="Зареєстрований" value={fmtDate(selectedUser.created_at)} />
                  <UserStatTile label="Статус" value={selectedUser.confirmed ? "Активний" : "Запрошений"} positive={selectedUser.confirmed} />
                </div>

                {/* Info rows */}
                <div className="px-5 pt-5 pb-4">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase mb-3">ПРОФІЛЬ</p>
                  <div className="space-y-2.5">
                    <UserInfoRow icon={Mail} value={selectedUser.email} href={`mailto:${selectedUser.email}`} />
                    {selectedUser.order_count > 0 && (
                      <UserInfoRow icon={ShoppingBag} value={`${selectedUser.order_count} замовлень · ${Math.round(selectedUser.lifetime_value_cents / 100).toLocaleString("uk-UA")} ₴`} />
                    )}
                    <UserInfoRow icon={Calendar} value={fmtDate(selectedUser.created_at)} label="Реєстрація" />
                    {(selectedUser.last_customer_activity_at || selectedUser.last_sign_in_at) && (
                      <UserInfoRow icon={Clock} value={fmtDate(selectedUser.last_customer_activity_at || selectedUser.last_sign_in_at)} label="Остання активність" />
                    )}
                    <UserInfoRow
                      icon={selectedUser.lifecycle_stage === "internal_staff" ? Shield : User}
                      value={STAGE_LABELS[selectedUser.lifecycle_stage]}
                      label="Сегмент"
                    />
                  </div>
                </div>

                {/* Role picker */}
                <div className="px-5 pb-5">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase mb-3">РОЛЬ</p>
                  <RolePicker
                    value={selectedUser.role || "viewer"}
                    onChange={(r) => setSelectedUser((u) => u ? { ...u, role: r } : u)}
                  />
                </div>

                {/* Name input */}
                <div className="px-5 pb-5 border-t pt-4">
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/50 uppercase mb-2">ІМ&apos;Я</p>
                  <Input
                    value={selectedUser.full_name}
                    onChange={(e) => setSelectedUser((u) => u ? { ...u, full_name: e.target.value } : u)}
                    className="h-10"
                    placeholder="Ім'я Прізвище"
                  />
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t shrink-0">
                <Button className="w-full h-10" onClick={handleEdit} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Зберегти зміни
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити користувача?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUser?.email} буде видалено назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPage>
  );
}

function UserInfoRow({
  icon: Icon,
  value,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-3.5 text-muted-foreground/50 shrink-0" />
      <div className="flex items-center gap-1.5 min-w-0">
        {href ? (
          <a href={href} className="text-sm text-primary hover:underline truncate">{value}</a>
        ) : (
          <span className="text-sm text-foreground/90 truncate">{value}</span>
        )}
        {label && <span className="text-[10px] text-muted-foreground/50 shrink-0">· {label}</span>}
      </div>
    </div>
  );
}

function UserStatTile({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-3 px-2 text-center gap-0.5">
      <p className={cn("text-sm font-bold truncate w-full text-center tabular-nums", positive ? "text-emerald-600" : "text-foreground")}>
        {value}
      </p>
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</p>
    </div>
  );
}