export type Role = "admin" | "manager" | "viewer" | "sewer" | "seamstress";
export type LifecycleStage = "registered_lead" | "client" | "internal_staff";

export interface AdminUser {
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

export const ROLES: { value: Exclude<Role, "seamstress">; label: string }[] = [
  { value: "admin", label: "Адмін" },
  { value: "manager", label: "Менеджер" },
  { value: "sewer", label: "Швея" },
  { value: "viewer", label: "Перегляд" },
];

export const TABS = [
  { key: "all", label: "Всі" },
  { key: "admin", label: "Адміни" },
  { key: "manager", label: "Менеджери" },
  { key: "sewer", label: "Швеї" },
  { key: "viewer", label: "Перегляд" },
] as const;

export const STAGE_LABELS: Record<LifecycleStage, string> = {
  registered_lead: "Зареєстрований лід",
  client: "Клієнт",
  internal_staff: "Команда",
};

export const STAGE_BADGE: Record<LifecycleStage, "success" | "info" | "secondary"> = {
  client: "success",
  registered_lead: "info",
  internal_staff: "secondary",
};

export function normalizeRole(role: Role | "") {
  return role === "seamstress" ? "sewer" : role;
}

export function stageLabel(user: AdminUser) {
  const role = user.access_role
    ? ROLES.find((r) => r.value === normalizeRole(user.access_role as Role))?.label
    : null;
  return role || STAGE_LABELS[user.lifecycle_stage];
}

const dateFormat = new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "short" });
const moneyFormat = new Intl.NumberFormat("uk-UA");

export function fmtDate(iso: string | null) {
  return iso ? dateFormat.format(new Date(iso)) : "—";
}

export function fmtMoney(cents: number) {
  return `${moneyFormat.format(Math.round(cents / 100))} ₴`;
}

export function initials(name: string, email: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return email.charAt(0).toUpperCase();
}

export function toEditable(u: AdminUser): AdminUser {
  return { ...u, role: normalizeRole((u.access_role || "viewer") as Role) as Role };
}

async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
  return data;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Помилка");
export const usersApi = request;
