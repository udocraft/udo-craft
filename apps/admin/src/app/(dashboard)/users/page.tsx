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
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminToolbar, AdminFilter, AdminTablePanel, AdminTabs } from "@/components/admin-layout";
import { UserPlus, Pencil, Trash2, RefreshCw, Loader2, Search } from "lucide-react";
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

function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={cn(
            "rounded-lg border py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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

const EMPTY_FORM = { email: "", full_name: "", role: "viewer" as Role };

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFilter = (searchParams.get("role") || "all") as Role | "all";
  const filter = rawFilter === "seamstress" ? "sewer" : rawFilter;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
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

        <div className="flex items-center gap-2">
           <AdminFilter
            label="Роль"
            active={filter !== "all"}
            value={filter === "all" ? undefined : TABS.find(t => t.key === filter)?.label}
            onClear={() => router.push("/users?role=all")}
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
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setEditUser({ ...u, role: normalizeRole((u.access_role || "viewer") as Role) })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteUser(u)}>
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Запросити користувача</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ім&apos;я</Label>
              <Input
                placeholder="Ім'я Прізвище"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Роль</Label>
              <RolePicker value={form.role} onChange={(r) => setForm((f) => ({ ...f, role: r }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>Скасувати</Button>
            <Button size="sm" onClick={handleInvite} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Надіслати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редагувати</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Ім&apos;я</Label>
                <Input
                  value={editUser.full_name}
                  onChange={(e) => setEditUser((u) => u ? { ...u, full_name: e.target.value } : u)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Роль</Label>
                <RolePicker
                  value={editUser.role || "viewer"}
                  onChange={(r) => setEditUser((u) => u ? { ...u, role: r } : u)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Скасувати</Button>
            <Button size="sm" onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
