import { z } from "zod";

// Constants
export const PX_TO_MM_RATIO = 0.5; // Example ratio

// Enums
export const PrintZoneSideEnum = z.enum(["front", "back"]);
export const LeadStatusEnum = z.enum(["draft", "new", "in_progress", "production", "completed", "archived"]);

// ── Product image model ─────────────────────────────────────────────────────

export const ProductImageSchema = z.object({
  key:             z.string(),                    // "front" | "back" | "lifestyle_1" | any string
  url:             z.string(),
  label:           z.string().default(""),        // human-readable, shown in admin
  is_customizable: z.boolean().default(false),    // true = canvas side, false = gallery only
  sort_order:      z.number().int().default(0),
});

export type ProductImage = z.infer<typeof ProductImageSchema>;

export interface ProductMarketingMeta {
  rating_avg?: number;
  rating_count?: number;
  delivery_min_days?: number;
  delivery_max_days?: number;
  min_order_qty?: number;
  promo_note?: string;
  delivery_note?: string;
  file_guidelines?: string;
  guide_url?: string;
  badges?: Array<string | ProductTrustBadge>;
  feature_groups?: Array<{
    title: string;
    icon?: string;
    items: Array<{ title: string; description?: string }>;
  }>;
}

export interface ProductTrustBadge {
  label: string;
  icon?: string;
}

export const DEFAULT_PRODUCT_FEATURE_GROUPS: NonNullable<ProductMarketingMeta["feature_groups"]> = [
  {
    title: "Кастомізація",
    icon: "layers",
    items: [
      { title: "DTG та DTFlex", description: "Перед, спина, рукави та внутрішня бірка" },
      { title: "Вишивка", description: "Груди, центр, рукав і брендовані деталі" },
    ],
  },
  {
    title: "Матеріал",
    icon: "shirt",
    items: [
      { title: "Зручна посадка", description: "Підходить для щоденного носіння команди" },
      { title: "Стабільна тканина", description: "Добре тримає форму після догляду" },
    ],
  },
  {
    title: "Сервіс",
    icon: "award",
    items: [
      { title: "Контроль макета", description: "Перевіряємо файли перед запуском" },
      { title: "Вироблено відповідально", description: "Планування тиражу, якості та відправки" },
    ],
  },
];

export const DEFAULT_PRODUCT_BADGES: ProductTrustBadge[] = [
  { label: "Від 10 одиниць", icon: "package-check" },
  { label: "Доставка по Україні", icon: "truck" },
  { label: "Контроль якості", icon: "shield" },
];

export const DEFAULT_PRODUCT_MARKETING_META: Required<
  Pick<ProductMarketingMeta, "rating_avg" | "rating_count" | "delivery_min_days" | "delivery_max_days" | "min_order_qty" | "promo_note" | "delivery_note" | "file_guidelines" | "guide_url" | "badges" | "feature_groups">
> = {
  rating_avg: 4.8,
  rating_count: 128,
  delivery_min_days: 7,
  delivery_max_days: 14,
  min_order_qty: 10,
  promo_note: "Більший тираж відкриває кращу ціну за одиницю.",
  delivery_note: "Виробництво займає 7-14 робочих днів після погодження макета. Доставка по Україні виконується зручним для вас перевізником.",
  file_guidelines: "- Приймаємо PNG, PDF, SVG або AI у високій якості.\n- Для друку бажаний прозорий фон і роздільна здатність від 300 dpi.\n- Перед запуском у виробництво менеджер перевіряє файл і погоджує макет.",
  guide_url: "/#contact",
  badges: DEFAULT_PRODUCT_BADGES,
  feature_groups: DEFAULT_PRODUCT_FEATURE_GROUPS,
};

export type NormalizedProductMarketingMeta = Omit<typeof DEFAULT_PRODUCT_MARKETING_META, "badges"> & {
  badges: ProductTrustBadge[];
};

export function normalizeProductMarketingMeta(meta?: ProductMarketingMeta): NormalizedProductMarketingMeta {
  return {
    rating_avg: meta?.rating_avg ?? DEFAULT_PRODUCT_MARKETING_META.rating_avg,
    rating_count: meta?.rating_count ?? DEFAULT_PRODUCT_MARKETING_META.rating_count,
    delivery_min_days: meta?.delivery_min_days ?? DEFAULT_PRODUCT_MARKETING_META.delivery_min_days,
    delivery_max_days: meta?.delivery_max_days ?? DEFAULT_PRODUCT_MARKETING_META.delivery_max_days,
    min_order_qty: meta?.min_order_qty ?? DEFAULT_PRODUCT_MARKETING_META.min_order_qty,
    promo_note: meta?.promo_note ?? DEFAULT_PRODUCT_MARKETING_META.promo_note,
    delivery_note: meta?.delivery_note ?? DEFAULT_PRODUCT_MARKETING_META.delivery_note,
    file_guidelines: meta?.file_guidelines ?? DEFAULT_PRODUCT_MARKETING_META.file_guidelines,
    guide_url: meta?.guide_url ?? DEFAULT_PRODUCT_MARKETING_META.guide_url,
    badges: normalizeProductTrustBadges(meta?.badges),
    feature_groups: meta?.feature_groups?.length ? meta.feature_groups : DEFAULT_PRODUCT_FEATURE_GROUPS,
  };
}

export function normalizeProductTrustBadges(badges?: ProductMarketingMeta["badges"]): ProductTrustBadge[] {
  if (!badges?.length) return DEFAULT_PRODUCT_BADGES;
  return badges
    .map((badge) => {
      if (typeof badge !== "string") return { label: badge.label.trim(), icon: badge.icon?.trim() || "badge-check" };
      const [label = "", icon = "badge-check"] = badge.split("|");
      return { label: label.trim(), icon: icon.trim() || "badge-check" };
    })
    .filter((badge) => badge.label);
}

export function parseMarketingLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function parseProductTrustBadges(value: string): ProductTrustBadge[] {
  return parseMarketingLines(value).map((line) => {
    const [label = "", icon = "badge-check"] = line.split("|");
    return { label: label.trim(), icon: icon.trim() || "badge-check" };
  }).filter((badge) => badge.label);
}

export function serializeProductTrustBadges(badges: ProductMarketingMeta["badges"]) {
  return normalizeProductTrustBadges(badges).map((badge) => `${badge.label}${badge.icon ? `|${badge.icon}` : ""}`).join("\n");
}

export function serializeProductFeatureGroups(groups: NonNullable<ProductMarketingMeta["feature_groups"]>) {
  return groups
    .map((group) => `${group.title}|${group.icon || "sparkles"}\n${group.items.map((item) => `- ${item.title}${item.description ? `: ${item.description}` : ""}`).join("\n")}`)
    .join("\n\n");
}

export function parseProductFeatureGroups(value: string): NonNullable<ProductMarketingMeta["feature_groups"]> {
  return value
    .split(/\n{2,}/)
    .map((block) => {
      const lines = parseMarketingLines(block);
      const [titleRaw = "", iconRaw = "sparkles"] = (lines[0] || "").split("|");
      const items = lines.slice(1).map((line) => {
        const clean = line.replace(/^[-•]\s*/, "");
        const [title = "", ...rest] = clean.split(":");
        return { title: title.trim(), description: rest.join(":").trim() || undefined };
      }).filter((item) => item.title);
      return { title: titleRaw.trim(), icon: iconRaw.trim() || "sparkles", items };
    })
    .filter((group) => group.title && group.items.length);
}

/**
 * Returns only customizable images as a legacy { key: url } map.
 * Drop-in replacement for reading product.images in canvas code.
 */
export function getCustomizableImages(imgs: ProductImage[]): Record<string, string> {
  return Object.fromEntries(
    imgs
      .filter((i) => i.is_customizable && i.url)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => [i.key, i.url])
  );
}

/**
 * Returns all images (customizable + gallery) as a { key: url } map.
 */
export function getAllImages(imgs: ProductImage[]): Record<string, string> {
  return Object.fromEntries(
    imgs
      .filter((i) => i.url)
      .sort((a, b) => {
        // Non-customizable first, then by sort_order
        if (a.is_customizable !== b.is_customizable) return a.is_customizable ? 1 : -1;
        return a.sort_order - b.sort_order;
      })
      .map((i) => [i.key, i.url])
  );
}

/**
 * Reads new product_images/variant_images column with fallback to legacy images Record.
 * Use this everywhere instead of reading .images directly.
 */
export function resolveProductImages(
  productImages: ProductImage[] | undefined | null,
  legacyImages: Record<string, string> | undefined | null
): ProductImage[] {
  if (productImages && productImages.length > 0) return productImages;
  // Convert legacy Record to ProductImage array, all marked customizable
  return Object.entries(legacyImages ?? {}).map(([key, url], i) => ({
    key,
    url,
    label: key,
    is_customizable: true,
    sort_order: i,
  }));
}

// Zod Schemas
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().default(""),
  base_price_cents: z.number().int(),
  discount_grid: z.array(z.object({ qty: z.number().int(), discount_pct: z.number() })).default([]).optional(),
  marketing_meta: z.record(z.string(), z.unknown()).default({}).optional(),
  images: z.record(z.string(), z.string()), // legacy — kept for backward compat
  product_images: z.array(ProductImageSchema).default([]), // new single source of truth
  px_to_mm_ratio: z.number(),
  collar_y_px: z.number().int(),
  is_active: z.boolean().default(true),
  is_customizable: z.boolean().default(false),
  available_sizes: z.array(z.string()).default(["S", "M", "L", "XL"]),
});

export const PrintZoneSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  side: PrintZoneSideEnum,
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  allowed_print_types: z.array(z.string()).default(["dtf"]).optional(),
});

export const LeadSchema = z.object({
  id: z.string().uuid(),
  status: LeadStatusEnum,
  customer_data: z.object({
    name: z.string(),
    email: z.string().email(),
    social_channel: z.string().url().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    topic: z.string().optional(),
    source: z.string().optional(),
    source_details: z.string().optional(),
    delivery: z.string().optional(),
    delivery_details: z.string().optional(),
    deadline: z.string().optional(),
    comment: z.string().optional(),
  }),
  total_amount_cents: z.number().int(),
});

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  product_id: z.string().uuid(),
  size: z.string(),
  color: z.string(),
  quantity: z.number().int().min(1),
  custom_print_url: z.string().url().optional(),
  mockup_url: z.string().url().optional(),
  technical_metadata: z.object({
    offset_top_mm: z.number(),
    print_size_mm: z.tuple([z.number(), z.number()]), // [width, height]
  }).optional(),
  unit_price_cents: z.number().int().nonnegative().optional(),
  print_cost_cents: z.number().int().nonnegative().optional(),
});

// TypeScript Interfaces inferred from Zod schemas
export type Product = z.infer<typeof ProductSchema>;
export type PrintZone = z.infer<typeof PrintZoneSchema>;
export type Lead = z.infer<typeof LeadSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type LeadStatus = z.infer<typeof LeadStatusEnum>;
export type PrintZoneSide = z.infer<typeof PrintZoneSideEnum>;

// ── Catalog hierarchy ───────────────────────────────────────────────────────

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  image_url: z.string().nullable().optional(),
});

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  hex_code: z.string().default("#000000"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const ProductColorVariantSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  material_id: z.string().uuid(),
  images: z.record(z.string(), z.string()),          // legacy — kept for backward compat
  variant_images: z.array(ProductImageSchema).default([]), // new single source of truth
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export type Category = z.infer<typeof CategorySchema>;
export type Material = z.infer<typeof MaterialSchema>;
export type ProductColorVariant = z.infer<typeof ProductColorVariantSchema>;

// ── ERP / inventory costing ─────────────────────────────────────────────────

export const ErpMaterialKindEnum = z.enum([
  "garment",
  "fabric",
  "print_supply",
  "hardware",
  "thread",
  "packaging",
  "service",
  "labor",
  "other",
]);

export const ErpMaterialSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sku: z.string().nullable().optional(),
  type_id: z.string().uuid().nullable().optional(),
  kind: ErpMaterialKindEnum.default("other"),
  unit: z.string().default("шт."),
  unit_cost_cents: z.number().int().nonnegative().default(0),
  stock_quantity: z.number().default(0),
  reserved_quantity: z.number().default(0),
  reorder_point: z.number().default(0),
  supplier: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const ErpMaterialTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: ErpMaterialKindEnum.default("other"),
  unit: z.string().default("шт."),
  color: z.string().default("#64748b"),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const ProductRecipeLineSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  erp_material_id: z.string().uuid(),
  role: z.string().default("material"),
  quantity: z.number().positive(),
  waste_percent: z.number().min(0).default(0),
  production_step: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

export const ErpDocumentStatusEnum = z.enum(["draft", "posted", "cancelled"]);
export const ErpPaymentStatusEnum = z.enum(["unpaid", "partial", "paid", "refunded"]);

export const ErpSupplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const ErpWarehouseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const ProductVariantSkuSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  color_variant_id: z.string().uuid().nullable().optional(),
  color_name: z.string().nullable().optional(),
  size: z.string(),
  sku: z.string(),
  sewing_cost_cents: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const ProductVariantRecipeLineSchema = z.object({
  id: z.string().uuid(),
  variant_sku_id: z.string().uuid(),
  erp_material_id: z.string().uuid(),
  role: z.string().default("material"),
  quantity: z.number().positive(),
  production_step: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

export const ErpGoodsReceiptLineSchema = z.object({
  id: z.string().uuid(),
  receipt_id: z.string().uuid(),
  erp_material_id: z.string().uuid(),
  unit: z.string().default("шт."),
  quantity: z.number().positive(),
  unit_cost_cents: z.number().int().nonnegative().default(0),
  total_cents: z.number().int().nonnegative().default(0),
  comment: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

export const ErpGoodsReceiptSchema = z.object({
  id: z.string().uuid(),
  document_no: z.string(),
  supplier_id: z.string().uuid().nullable().optional(),
  warehouse_id: z.string().uuid().nullable().optional(),
  status: ErpDocumentStatusEnum.default("draft"),
  comment: z.string().nullable().optional(),
  total_cents: z.number().int().nonnegative().default(0),
  posted_at: z.string().nullable().optional(),
});

export const ErpProductionOrderLineSchema = z.object({
  id: z.string().uuid(),
  production_order_id: z.string().uuid(),
  variant_sku_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
  due_date: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  material_requirements: z.array(z.record(z.string(), z.unknown())).default([]),
  sort_order: z.number().int().default(0),
});

export type ErpMaterialKind = z.infer<typeof ErpMaterialKindEnum>;
export type ErpMaterial = z.infer<typeof ErpMaterialSchema>;
export type ErpMaterialType = z.infer<typeof ErpMaterialTypeSchema>;
export type ProductRecipeLine = z.infer<typeof ProductRecipeLineSchema>;
export type ErpDocumentStatus = z.infer<typeof ErpDocumentStatusEnum>;
export type ErpPaymentStatus = z.infer<typeof ErpPaymentStatusEnum>;
export type ErpSupplier = z.infer<typeof ErpSupplierSchema>;
export type ErpWarehouse = z.infer<typeof ErpWarehouseSchema>;
export type ProductVariantSku = z.infer<typeof ProductVariantSkuSchema>;
export type ProductVariantRecipeLine = z.infer<typeof ProductVariantRecipeLineSchema>;
export type ErpGoodsReceipt = z.infer<typeof ErpGoodsReceiptSchema>;
export type ErpGoodsReceiptLine = z.infer<typeof ErpGoodsReceiptLineSchema>;
export type ErpProductionOrderLine = z.infer<typeof ErpProductionOrderLineSchema>;

// ── Print types & fonts ─────────────────────────────────────────────────────

// Shared print type constants and types — no fabric dependency, safe for SSR
export const PRINT_TYPES = [
  { id: "dtf",         label: "DTF",        color: "#6366f1", bg: "#eef2ff", desc: "Прямий друк" },
  { id: "embroidery",  label: "Вишивка",    color: "#ec4899", bg: "#fdf2f8", desc: "Машинна вишивка" },
  { id: "screen",      label: "Шовкодрук",  color: "#f59e0b", bg: "#fffbeb", desc: "Трафаретний друк" },
  { id: "sublimation", label: "Сублімація", color: "#06b6d4", bg: "#ecfeff", desc: "Термоперенос" },
  { id: "patch",       label: "Нашивка",    color: "#10b981", bg: "#ecfdf5", desc: "Тканинна нашивка" },
] as const;

export type PrintTypeId = typeof PRINT_TYPES[number]["id"];

/**
 * Google Fonts with full Cyrillic support — visually distinct families.
 */
export const TEXT_FONTS = [
  { id: "Montserrat",       label: "Montserrat",       style: "sans-serif", category: "Гротеск"       },
  { id: "PT Sans",          label: "PT Sans",          style: "sans-serif", category: "Гротеск"       },
  { id: "PT Serif",         label: "PT Serif",         style: "serif",      category: "Антиква"       },
  { id: "Playfair Display", label: "Playfair Display", style: "serif",      category: "Антиква"       },
  { id: "Oswald",           label: "Oswald",           style: "sans-serif", category: "Конденсований" },
  { id: "Raleway",          label: "Raleway",          style: "sans-serif", category: "Гротеск"       },
  { id: "Comfortaa",        label: "Comfortaa",        style: "cursive",    category: "Декоративний"  },
  { id: "Exo 2",            label: "Exo 2",            style: "sans-serif", category: "Технічний"     },
  { id: "Nunito",           label: "Nunito",           style: "sans-serif", category: "Гротеск"       },
  { id: "Merriweather",     label: "Merriweather",     style: "serif",      category: "Антиква"       },
  { id: "Unbounded",        label: "Unbounded",        style: "sans-serif", category: "Дисплейний"    },
  { id: "Jost",             label: "Jost",             style: "sans-serif", category: "Гротеск"       },
  { id: "Philosopher",      label: "Philosopher",      style: "serif",      category: "Антиква"       },
  { id: "Russo One",        label: "Russo One",        style: "sans-serif", category: "Дисплейний"    },
  { id: "Marck Script",     label: "Marck Script",     style: "cursive",    category: "Рукописний"    },
  { id: "Pacifico",         label: "Pacifico",         style: "cursive",    category: "Декоративний"  },
  { id: "Caveat",           label: "Caveat",           style: "cursive",    category: "Рукописний"    },
  { id: "Neucha",           label: "Neucha",           style: "cursive",    category: "Рукописний"    },
  { id: "Stalinist One",    label: "Stalinist One",    style: "display",    category: "Дисплейний"    },
  { id: "Press Start 2P",   label: "Press Start 2P",   style: "monospace",  category: "Технічний"     },
] as const;

export type TextFontId = typeof TEXT_FONTS[number]["id"];

export interface PrintLayer {
  id: string;
  /** For image layers: the File object. For text layers: a synthetic File (empty placeholder). */
  file: File;
  /** For image layers: blob/uploaded URL. For text layers: empty string. */
  url: string;
  uploadedUrl?: string;
  type: PrintTypeId;
  side: string;
  sizeLabel?: string;
  sizeMinCm?: number;
  sizeMaxCm?: number;
  priceCents?: number;
  /** Canvas transform */
  transform?: { left: number; top: number; scaleX: number; scaleY: number; angle: number; flipX: boolean };
  /** Layer kind — absent means "image" (legacy compat) */
  kind?: "image" | "text" | "drawing";
  /** For SVG shape layers — fill color override */
  svgFillColor?: string;
  /** For SVG shape layers — stroke color override */
  svgStrokeColor?: string;
  // ── Existing text fields (unchanged) ──────────────────────────────────
  textContent?: string;
  textFont?: TextFontId;
  textColor?: string;
  textFontSize?: number;
  textAlign?: "left" | "center" | "right";
  /** Curve radius in degrees: 0 = straight, positive = arc up, negative = arc down */
  textCurve?: number;
  // ── New text fields ────────────────────────────────────────────────────
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Maps to Fabric.js charSpacing; range -10 to 100 */
  textLetterSpacing?: number;
  /** Maps to Fabric.js lineHeight; range 0.5 to 3.0 */
  textLineHeight?: number;
  /** Maps to Fabric.js fontWeight: "bold" | "normal" */
  textBold?: boolean;
  /** Maps to Fabric.js fontStyle: "italic" | "normal" */
  textItalic?: boolean;
  textOverflow?: "clip" | "auto";
  /** Maps to Fabric.js backgroundColor on Textbox */
  textBackgroundColor?: string;
  /** Maps to Fabric.js stroke on Textbox */
  textStrokeColor?: string;
  /** Maps to Fabric.js strokeWidth; range 0–20 */
  textStrokeWidth?: number;
  /** Maps to Fabric.js Textbox width (px) */
  textBoxWidth?: number;
  /** Maps to Fabric.js Textbox height (px) */
  textBoxHeight?: number;
  /** Layer opacity 0–1 */
  opacity?: number;
  /** Text combo parent grouping ID */
  comboId?: string;
  /** Whether this layer is a secondary child of a text combo (cost is 0) */
  isComboChild?: boolean;
}

// ── Shape presets ───────────────────────────────────────────────────────────

export const ELEMENT_PRESETS = [
  // Basic Shapes
  { id: "rect-01",      name: "Rectangle",     category: "Basic Shapes",   svgPath: "/shapes/basic/rect.svg",           tags: ["rectangle", "box", "square"] },
  { id: "circle-01",    name: "Circle",         category: "Basic Shapes",   svgPath: "/shapes/basic/circle.svg",         tags: ["circle", "round", "ellipse"] },
  { id: "triangle-01",  name: "Triangle",       category: "Basic Shapes",   svgPath: "/shapes/basic/triangle.svg",       tags: ["triangle", "arrow"] },
  // Polygons
  { id: "hex-01",       name: "Hexagon",        category: "Polygons",       svgPath: "/shapes/polygons/hexagon.svg",     tags: ["hexagon", "hex", "polygon"] },
  { id: "pent-01",      name: "Pentagon",       category: "Polygons",       svgPath: "/shapes/polygons/pentagon.svg",    tags: ["pentagon", "polygon"] },
  { id: "oct-01",       name: "Octagon",        category: "Polygons",       svgPath: "/shapes/polygons/octagon.svg",     tags: ["octagon", "polygon", "stop"] },
  // Stars
  { id: "star4-01",     name: "4-Point Star",   category: "Stars",          svgPath: "/shapes/stars/star4.svg",          tags: ["star", "sparkle"] },
  { id: "star5-01",     name: "5-Point Star",   category: "Stars",          svgPath: "/shapes/stars/star5.svg",          tags: ["star", "favorite"] },
  { id: "star6-01",     name: "6-Point Star",   category: "Stars",          svgPath: "/shapes/stars/star6.svg",          tags: ["star", "david"] },
  // Arrows
  { id: "arrow-r-01",   name: "Arrow Right",    category: "Arrows",         svgPath: "/shapes/arrows/arrow-right.svg",   tags: ["arrow", "direction", "right"] },
  { id: "arrow-l-01",   name: "Arrow Left",     category: "Arrows",         svgPath: "/shapes/arrows/arrow-left.svg",    tags: ["arrow", "direction", "left"] },
  { id: "arrow-dbl-01", name: "Double Arrow",   category: "Arrows",         svgPath: "/shapes/arrows/arrow-double.svg",  tags: ["arrow", "double", "both"] },
  // Speech Bubbles
  { id: "bubble-01",    name: "Speech Bubble",  category: "Speech Bubbles", svgPath: "/shapes/bubbles/bubble.svg",       tags: ["speech", "bubble", "chat", "talk"] },
  { id: "bubble-02",    name: "Thought Bubble", category: "Speech Bubbles", svgPath: "/shapes/bubbles/thought.svg",      tags: ["thought", "bubble", "cloud"] },
  // Clouds
  { id: "cloud-01",     name: "Cloud",          category: "Clouds",         svgPath: "/shapes/clouds/cloud.svg",         tags: ["cloud", "sky", "weather"] },
  { id: "cloud-02",     name: "Storm Cloud",    category: "Clouds",         svgPath: "/shapes/clouds/storm.svg",         tags: ["cloud", "storm", "rain"] },
  // Hearts
  { id: "heart-01",     name: "Heart",          category: "Hearts",         svgPath: "/shapes/hearts/heart.svg",         tags: ["heart", "love", "valentine"] },
  { id: "heart-02",     name: "Heart Outline",  category: "Hearts",         svgPath: "/shapes/hearts/heart-outline.svg", tags: ["heart", "love", "outline"] },
  // Banners
  { id: "banner-01",    name: "Ribbon Banner",  category: "Banners",        svgPath: "/shapes/banners/ribbon.svg",       tags: ["banner", "ribbon", "label"] },
  { id: "banner-02",    name: "Scroll Banner",  category: "Banners",        svgPath: "/shapes/banners/scroll.svg",       tags: ["banner", "scroll", "vintage"] },
  // Frames
  { id: "frame-01",     name: "Square Frame",   category: "Frames",         svgPath: "/shapes/frames/square.svg",        tags: ["frame", "border", "square"] },
  { id: "frame-02",     name: "Oval Frame",     category: "Frames",         svgPath: "/shapes/frames/oval.svg",          tags: ["frame", "oval", "border"] },
  // Decorative
  { id: "deco-01",      name: "Sunflower",      category: "Decorative",     svgPath: "/shapes/decorative/sunflower.svg", tags: ["sunflower", "flower", "ukraine"] },
  { id: "deco-02",      name: "Vyshyvanka",     category: "Decorative",     svgPath: "/shapes/decorative/vyshyvanka.svg",tags: ["vyshyvanka", "ukraine", "pattern", "embroidery"] },
] as const satisfies ReadonlyArray<{ id: string; name: string; category: string; svgPath: string; tags: string[] }>;

export type ElementPreset = typeof ELEMENT_PRESETS[number];

export const SHAPE_CATEGORIES = [
  "Basic Shapes",
  "Polygons",
  "Stars",
  "Arrows",
  "Speech Bubbles",
  "Clouds",
  "Hearts",
  "Banners",
  "Frames",
  "Decorative",
] as const;

export type ShapeCategory = typeof SHAPE_CATEGORIES[number];

// ── Font combo presets ──────────────────────────────────────────────────────

export const FONT_COMBO_PRESETS = [
  { id: "classic",   name: "Classic",   headingFont: "Playfair Display", bodyFont: "PT Sans"      },
  { id: "modern",    name: "Modern",    headingFont: "Montserrat",       bodyFont: "Jost"         },
  { id: "editorial", name: "Editorial", headingFont: "Philosopher",      bodyFont: "Raleway"      },
  { id: "bold",      name: "Bold",      headingFont: "Unbounded",        bodyFont: "Exo 2"        },
  { id: "elegant",   name: "Elegant",   headingFont: "Philosopher",      bodyFont: "Merriweather" },
  { id: "playful",   name: "Playful",   headingFont: "Pacifico",         bodyFont: "Comfortaa"    },
  { id: "condensed", name: "Condensed", headingFont: "Oswald",           bodyFont: "Nunito"       },
] as const satisfies ReadonlyArray<{ id: string; name: string; headingFont: TextFontId; bodyFont: TextFontId }>;

export type FontComboPreset = typeof FONT_COMBO_PRESETS[number];

// ── Text compositions ───────────────────────────────────────────────────────

export interface TextComposition {
  id: string;
  label: string;
  layers: Array<{
    textContent: string;
    textFont: TextFontId;
    textFontSize: number;
    textColor: string;
    textAlign: "left" | "center" | "right";
    textBold?: boolean;
    textItalic?: boolean;
    textCurve?: number;
    offsetY?: number;
  }>;
}

export const TEXT_COMPOSITIONS: TextComposition[] = [
  {
    id: "bold-single",
    label: "Жирний заголовок",
    layers: [{ textContent: "ВАША КОМАНДА", textFont: "Unbounded", textFontSize: 52, textColor: "#000000", textAlign: "center", textBold: true }],
  },
  {
    id: "elegant-heading",
    label: "Елегантний заголовок",
    layers: [{ textContent: "Ваш текст тут", textFont: "Playfair Display", textFontSize: 48, textColor: "#1a1a1a", textAlign: "center", textItalic: true }],
  },
  {
    id: "corporate-combo",
    label: "Корпоративний",
    layers: [
      { textContent: "НАЗВА КОМПАНІЇ", textFont: "Montserrat", textFontSize: 40, textColor: "#000000", textAlign: "center", textBold: true, offsetY: -30 },
      { textContent: "з 2005 року", textFont: "PT Sans", textFontSize: 22, textColor: "#666666", textAlign: "center", offsetY: 30 },
    ],
  },
  {
    id: "retro-display",
    label: "Ретро",
    layers: [{ textContent: "РЕТРО СТИЛЬ", textFont: "Russo One", textFontSize: 48, textColor: "#c0392b", textAlign: "center" }],
  },
  {
    id: "script-accent",
    label: "Рукописний акцент",
    layers: [{ textContent: "Ваш текст", textFont: "Marck Script", textFontSize: 56, textColor: "#2c3e50", textAlign: "center" }],
  },
  {
    id: "curved-arc",
    label: "Дуга вгору",
    layers: [{ textContent: "ВАША КОМАНДА", textFont: "Montserrat", textFontSize: 36, textColor: "#000000", textAlign: "center", textBold: true, textCurve: 120 }],
  },
  {
    id: "curved-arc-down",
    label: "Дуга вниз",
    layers: [{ textContent: "ВАША КОМАНДА", textFont: "Montserrat", textFontSize: 36, textColor: "#000000", textAlign: "center", textBold: true, textCurve: -120 }],
  },
  {
    id: "playful-combo",
    label: "Ігровий",
    layers: [
      { textContent: "ГРАЙ", textFont: "Pacifico", textFontSize: 52, textColor: "#8e44ad", textAlign: "center", offsetY: -25 },
      { textContent: "з нами", textFont: "Comfortaa", textFontSize: 28, textColor: "#2980b9", textAlign: "center", offsetY: 35 },
    ],
  },
  {
    id: "minimal-caps",
    label: "Мінімалістичний",
    layers: [{ textContent: "МІНІМАЛІЗМ", textFont: "Jost", textFontSize: 44, textColor: "#000000", textAlign: "center", textBold: false }],
  },
  {
    id: "handwritten-note",
    label: "Рукописна нотатка",
    layers: [
      { textContent: "Зроблено з", textFont: "Caveat", textFontSize: 32, textColor: "#555555", textAlign: "center", offsetY: -20 },
      { textContent: "❤ любов'ю", textFont: "Caveat", textFontSize: 44, textColor: "#e74c3c", textAlign: "center", offsetY: 25 },
    ],
  },
];

// ── Print presets ───────────────────────────────────────────────────────────

export const PrintPresetSchema = z.object({
  id:            z.string().uuid(),
  name:          z.string(),
  category:      z.string(),
  thumbnail_url: z.string().url(),
  file_url:      z.string().url(),
  tags:          z.array(z.string()).default([]),
  sort_order:    z.number().int().default(0),
  is_active:     z.boolean().default(true),
});

export type PrintPreset = z.infer<typeof PrintPresetSchema>;

// ── Sidebar tab IDs ─────────────────────────────────────────────────────────

export type SidebarTabId = "prints" | "draw" | "text" | "upload" | "layers" | "shapes";

// ── Order constants ─────────────────────────────────────────────────────────

export const PREDEFINED_TAGS = [
  { id: "paid_100",   label: "Оплачено 100%", color: "#16a34a", bg: "#dcfce7" },
  { id: "paid_50",    label: "Оплачено 50%",  color: "#d97706", bg: "#fef3c7" },
  { id: "urgent",     label: "Терміново",     color: "#dc2626", bg: "#fee2e2" },
  { id: "vip",        label: "VIP",           color: "#7c3aed", bg: "#ede9fe" },
  { id: "new_client", label: "Новий клієнт",  color: "#0284c7", bg: "#e0f2fe" },
] as const;

export const DISCOUNT_TIERS = [
  { min: 10, max: 49,   pct: 5  },
  { min: 50, max: 99,   pct: 12 },
  { min: 100, max: null, pct: 15 },
] as const;

// ── Lead validation ─────────────────────────────────────────────────────────

export const CreateLeadSchema = z.object({
  status: LeadStatusEnum,
  customer_data: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    social_channel: z.string().optional(),
    phone: z.string().min(1),
    website: z.string().optional(), // honeypot — should always be empty for real users
    company: z.string().optional(),
    topic: z.string().optional(),
    source: z.string().optional(),
  }),
  total_amount_cents: z.number().int().optional(),
});

export type CreateLead = z.infer<typeof CreateLeadSchema>;

// ── useCustomizer hook ──────────────────────────────────────────────────────

export {
  useCustomizer,
  getUploadUrl,
  type UseCustomizerConfig,
  type UseCustomizerReturn,
  type HandleAddToCartParams,
  type HandleAddToCartResult,
  type PrintTypePricingRow,
} from "./src/useCustomizer";
