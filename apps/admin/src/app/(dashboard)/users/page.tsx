"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { UserPlus, Pencil, Trash2, RefreshCw, Loader2, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "admin" | "manager" | "viewer" | "seamstress";
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

const ROLES: { value: Role; label: string }[] = [
  { value: "admin",   label: "Адмін" },
  { value: "manager", label: "Менеджер" },
  { value: "seamstress", label: "Швея" },
  { value: "viewer",  label: "Перегляд" },
];

const ROLE_PERMISSIONS: Record<Role, { title: string; description: string }> = {
  admin: {
    title: "Повний доступ",
    description: "Керує замовленнями, складом CRM-ERP, каталогом, користувачами, ролями та системними налаштуваннями.",
  },
  manager: {
    title: "Продажі та операції",
    description: "Бачить клієнтів, замовлення, повідомлення, складські процеси, виробництво і пов'язані документи.",
  },
  seamstress: {
    title: "Виробництво і пов'язані роботи",
    description: "Бачить склад CRM-ERP, виробничі замовлення, дефіцити, акти пошиття та замовлення, де потрібна її участь.",
  },
  viewer: {
    title: "Лише перегляд",
    description: "Має огляд даних без операційної відповідальності за CRUD-процеси та керування користувачами.",
  },
};

function roleLabel(role: Role) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

const STAGE_LABELS: Record<LifecycleStage, string> = {
  registered_lead: "Зареєстрований лід",
  client: "Клієнт",
  internal_staff: "Команда",
};

function stageLabel(user: AdminUser) {
  return user.access_role ? roleLabel(user.access_role) : STAGE_LABELS[user.lifecycle_stage];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name: string, email: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return email.charAt(0).toUpperCase();
}

// ── Role picker used in both dialogs ─────────────────────────────────────────

function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={cn(
            "rounded-lg border py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            value === r.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { email: "", full_name: "", role: "viewer" as Role };

export default function UsersPage() {
  const searchParams = useSearchParams();
  const filter = (searchParams.get("role") || "all") as Role | "all";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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

  const visible = filter === "all" ? users : users.filter((u) => u.access_role === filter);
  const staffUsers = users.filter((u) => u.lifecycle_stage === "internal_staff");
  const registeredLeads = users.filter((u) => u.lifecycle_stage === "registered_lead");
  const clientUsers = users.filter((u) => u.lifecycle_stage === "client");
  const clientRevenue = clientUsers.reduce((sum, user) => sum + user.lifetime_value_cents, 0);

  const handleInvite = async () => {
    if (!form.email) { toast.error("Введіть email"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: editUser.full_name, role: editUser.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Оновлено");
      setEditUser(null);
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

  const subtitleElem = (
    <span className="flex items-center gap-1">
      <Users className="size-3.5" /> {users.length} користувачів
    </span>
  );

  const actionsElem = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Оновити">
        <RefreshCw className={cn("size-4", loading && "animate-spin")} />
      </Button>
      <Button onClick={() => { setForm(EMPTY_FORM); setInviteOpen(true); }}>
        <UserPlus className="size-4 mr-2" />
        Запросити
      </Button>
    </div>
  );

  return (
    <DashboardPage
      title="Користувачі"
      subtitle={subtitleElem}
      actions={actionsElem}
      contentClassName="p-4 md:p-6 space-y-5"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered leads</p>
          <p className="mt-2 text-2xl font-bold">{registeredLeads.length}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Акаунт створено, але ще немає чату з менеджером або замовлення.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clients</p>
          <p className="mt-2 text-2xl font-bold">{clientUsers.length}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Є замовлення або діалог з менеджером.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Internal team</p>
          <p className="mt-2 text-2xl font-bold">{staffUsers.length}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Адміни, менеджери, виробництво і перегляд.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client LTV</p>
          <p className="mt-2 text-2xl font-bold">{Math.round(clientRevenue / 100).toLocaleString("uk-UA")} ₴</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Сума замовлень прив&apos;язаних до акаунтів.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {ROLES.map((role) => (
          <div key={role.value} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <p className="text-sm font-semibold">{role.label}</p>
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{ROLE_PERMISSIONS[role.value].title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ROLE_PERMISSIONS[role.value].description}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Користувач</TableHead>
                <TableHead>Сегмент</TableHead>
                <TableHead className="hidden lg:table-cell">Замовлення</TableHead>
                <TableHead className="hidden md:table-cell">Зареєстрований</TableHead>
                <TableHead className="hidden md:table-cell">Остання активність</TableHead>
                <TableHead className="hidden sm:table-cell">Статус</TableHead>
                <TableHead className="w-16"><span className="sr-only">Дії</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Немає користувачів
                  </TableCell>
                </TableRow>
              )}
              {visible.map((u) => (
                <TableRow key={u.id}>
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
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className={cn(
                      "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
                      u.lifecycle_stage === "client" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      u.lifecycle_stage === "registered_lead" && "border-sky-200 bg-sky-50 text-sky-700",
                      u.lifecycle_stage === "internal_staff" && "border-violet-200 bg-violet-50 text-violet-700"
                    )}>
                      {stageLabel(u)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {u.order_count ? `${u.order_count} · ${Math.round(u.lifetime_value_cents / 100).toLocaleString("uk-UA")} ₴` : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{fmtDate(u.last_customer_activity_at || u.last_sign_in_at)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {u.confirmed ? "Активний" : "Запрошений"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditUser({ ...u, role: u.access_role || "viewer" })} aria-label="Редагувати">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteUser(u)} aria-label="Видалити">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Запросити користувача</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ім&apos;я</Label>
              <Input
                placeholder="Ім'я Прізвище"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Роль</Label>
              <RolePicker value={form.role} onChange={(r) => setForm((f) => ({ ...f, role: r }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Скасувати</Button>
            <Button onClick={handleInvite} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Надіслати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редагувати</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Ім&apos;я</Label>
                <Input
                  value={editUser.full_name}
                  onChange={(e) => setEditUser((u) => u ? { ...u, full_name: e.target.value } : u)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Роль</Label>
                <RolePicker
                  value={editUser.role || "viewer"}
                  onChange={(r) => setEditUser((u) => u ? { ...u, role: r } : u)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Скасувати</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
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
