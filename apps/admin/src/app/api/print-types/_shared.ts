// Validation shared by the print-types routes. Access control is in middleware
// (/api/print-* -> catalog.read / catalog.write).

export const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export type PrintTypeInput = {
  id?: string;
  label?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  sort_order?: number;
};

/** Returns a clean patch or an error message. `requireAll` for create. */
export function validatePrintType(body: unknown, requireAll: boolean): { data: PrintTypeInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Некоректні дані" };
  const b = body as Record<string, unknown>;
  const out: PrintTypeInput = {};

  if (b.id !== undefined || requireAll) {
    const id = String(b.id ?? "").trim().toLowerCase();
    if (!ID_RE.test(id)) return { error: "Код: латиниця, цифри, - або _, до 40 символів" };
    out.id = id;
  }
  if (b.label !== undefined || requireAll) {
    const label = String(b.label ?? "").trim();
    if (!label || label.length > 60) return { error: "Назва обов'язкова (до 60 символів)" };
    out.label = label;
  }
  if (b.description !== undefined) out.description = String(b.description).trim().slice(0, 200);
  if (b.color !== undefined) {
    const color = String(b.color).trim();
    if (!COLOR_RE.test(color)) return { error: "Колір у форматі #RRGGBB" };
    out.color = color;
  }
  if (b.is_active !== undefined) out.is_active = Boolean(b.is_active);
  if (b.sort_order !== undefined) {
    const n = Number(b.sort_order);
    if (!Number.isFinite(n)) return { error: "Порядок має бути числом" };
    out.sort_order = Math.round(n);
  }
  return { data: out };
}
