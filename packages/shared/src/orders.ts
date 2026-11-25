import { z } from "zod";

/**
 * Canonical order (lead) contract shared by the storefront, the admin and the
 * Telegram mini-app. Keep status names in sync with the `lead_status` SQL enum.
 */

export const LEAD_STATUSES = ["draft", "new", "in_progress", "production", "completed", "archived"] as const;
export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

/** Ukrainian staff-facing labels. Storefront copy lives in next-intl messages. */
export const LEAD_STATUS_LABELS: Record<LeadStatusValue, string> = {
  draft: "Чернетка",
  new: "Новий",
  in_progress: "В роботі",
  production: "Виробництво",
  completed: "Завершено",
  archived: "Архів",
};

/**
 * Allowed status moves. Staff can step back between active states to correct
 * mistakes; nothing moves back to `draft`; archived orders can only be reopened
 * as `new` or `in_progress`.
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatusValue, readonly LeadStatusValue[]> = {
  draft: ["new", "in_progress", "archived"],
  new: ["in_progress", "production", "completed", "archived"],
  in_progress: ["new", "production", "completed", "archived"],
  production: ["in_progress", "completed", "archived"],
  completed: ["production", "archived"],
  archived: ["new", "in_progress"],
};

export function isLeadStatus(value: unknown): value is LeadStatusValue {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

export function canTransitionLead(from: string, to: string): boolean {
  if (from === to) return true;
  if (!isLeadStatus(from) || !isLeadStatus(to)) return false;
  return LEAD_STATUS_TRANSITIONS[from].includes(to);
}

export function leadStatusLabel(status: string | null | undefined): string {
  return isLeadStatus(status) ? LEAD_STATUS_LABELS[status] : status ?? "";
}

/** Fields staff may change through PATCH /api/leads/[id]. Anything else is rejected. */
export const AdminLeadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES),
    customer_data: z.record(z.unknown()),
    notes: z.string().max(10_000).nullable(),
    tags: z.array(z.string().max(64)).max(50),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
export type AdminLeadUpdate = z.infer<typeof AdminLeadUpdateSchema>;

// ── Pricing ─────────────────────────────────────────────────────────────────

export interface DiscountTier {
  qty: number;
  discount_pct: number;
}

/**
 * Volume discount used when a product has no `discount_grid` of its own.
 * These are the tiers the server and invoices already charged.
 */
export const DEFAULT_DISCOUNT_GRID: readonly DiscountTier[] = [
  { qty: 10, discount_pct: 5 },
  { qty: 50, discount_pct: 12 },
  { qty: 100, discount_pct: 15 },
];

function normaliseGrid(grid: unknown): DiscountTier[] {
  if (!Array.isArray(grid)) return [];
  return grid
    .map((t) => ({ qty: Number((t as DiscountTier)?.qty), discount_pct: Number((t as DiscountTier)?.discount_pct) }))
    .filter((t) => Number.isFinite(t.qty) && t.qty > 0 && Number.isFinite(t.discount_pct) && t.discount_pct >= 0 && t.discount_pct < 100);
}

/** Discount percent for a quantity: the product's own grid, else the default grid. */
export function discountPctForQty(grid: unknown, quantity: number): number {
  const own = normaliseGrid(grid);
  const tiers = own.length > 0 ? own : [...DEFAULT_DISCOUNT_GRID];
  const sorted = [...tiers].sort((a, b) => b.qty - a.qty);
  return sorted.find((t) => quantity >= t.qty)?.discount_pct ?? 0;
}

export interface PrintPricingRow {
  print_type: string;
  size_label: string;
  qty_tiers: { min_qty: number; price_cents: number }[];
}

export interface PricedLayer {
  type?: string;
  sizeLabel?: string;
  isComboChild?: boolean;
}

/** Per-unit print price for one layer from the print pricing table. 0 when unpriced. */
export function printLayerUnitCents(layer: PricedLayer, quantity: number, rows: readonly PrintPricingRow[]): number {
  if (layer.isComboChild || !layer.type || !layer.sizeLabel) return 0;
  const row = rows.find((r) => r.print_type === layer.type && r.size_label === layer.sizeLabel);
  if (!row || !Array.isArray(row.qty_tiers) || row.qty_tiers.length === 0) return 0;
  const sorted = [...row.qty_tiers].sort((a, b) => b.min_qty - a.min_qty);
  const tier = sorted.find((t) => quantity >= t.min_qty) ?? sorted[sorted.length - 1];
  return Math.max(0, Math.round(tier?.price_cents ?? 0));
}

export interface LinePrice {
  /** Garment price per unit after the volume discount, whole cents. */
  unitPriceCents: number;
  /** Print price per unit, whole cents. */
  printCostCents: number;
  discountPct: number;
  /** (unit + print) x quantity. */
  lineTotalCents: number;
}

/** One order line. Every surface that shows or stores a price must use this. */
export function priceOrderLine(input: {
  basePriceCents: number;
  quantity: number;
  discountGrid?: unknown;
  layers?: readonly PricedLayer[];
  printPricing?: readonly PrintPricingRow[];
}): LinePrice {
  const discountPct = discountPctForQty(input.discountGrid, input.quantity);
  const unitPriceCents = Math.round(input.basePriceCents * (1 - discountPct / 100));
  const printCostCents = (input.layers ?? []).reduce(
    (sum, layer) => sum + printLayerUnitCents(layer, input.quantity, input.printPricing ?? []),
    0,
  );
  return {
    unitPriceCents,
    printCostCents,
    discountPct,
    lineTotalCents: (unitPriceCents + printCostCents) * input.quantity,
  };
}
