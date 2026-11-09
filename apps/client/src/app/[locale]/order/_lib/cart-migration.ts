import type { CartItem } from "../_components/CartSummary";

type LegacyCartItem = {
  product: {
    id: string;
    name: string;
    images: Record<string, string>;
    base_price_cents: number;
  };
  size: string;
  color: string;
  quantity: number;
  mockupDataUrl?: string;
  offsetTopMm?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLegacyItem(value: unknown): LegacyCartItem | null {
  if (!isRecord(value) || !isRecord(value.product)) return null;

  const { product } = value;
  const { id, name, base_price_cents: basePriceCents } = product;
  const images = isRecord(product.images) ? product.images : {};
  const validImages = Object.fromEntries(
    Object.entries(images).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  const { size, color, quantity, mockupDataUrl, offsetTopMm } = value;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof basePriceCents !== "number" ||
    !Number.isFinite(basePriceCents) ||
    basePriceCents < 0 ||
    typeof size !== "string" ||
    typeof color !== "string" ||
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    (mockupDataUrl !== undefined && typeof mockupDataUrl !== "string") ||
    (offsetTopMm !== undefined && (typeof offsetTopMm !== "number" || !Number.isFinite(offsetTopMm)))
  ) {
    return null;
  }

  return {
    product: { id, name, images: validImages, base_price_cents: basePriceCents },
    size,
    color,
    quantity,
    mockupDataUrl,
    offsetTopMm,
  };
}

export function migrateLegacyCheckoutCart(value: unknown): CartItem[] | null {
  if (!Array.isArray(value)) return null;
  const legacyItems = value.map(parseLegacyItem);
  const validItems = legacyItems.filter((item): item is LegacyCartItem => item !== null);
  if (validItems.length !== value.length) return null;

  return validItems.map(({ product, size, color, quantity, mockupDataUrl, offsetTopMm }) => ({
    productId: product.id,
    productName: product.name,
    productImage: product.images.front ?? Object.values(product.images)[0] ?? "",
    productPrice: product.base_price_cents,
    unitPriceCents: product.base_price_cents,
    printCostCents: 0,
    quantity,
    size,
    color,
    layers: [],
    mockupDataUrl,
    offsetTopMm,
  }));
}
