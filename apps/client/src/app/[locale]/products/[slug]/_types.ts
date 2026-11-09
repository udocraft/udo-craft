import type { Product, ProductMarketingMeta } from "@udo-craft/shared";

export interface ProductWithMeta extends Omit<Product, "description" | "marketing_meta"> {
  description?: string;
  category_id?: string | null;
  size_chart_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
  marketing_meta?: ProductMarketingMeta;
}
