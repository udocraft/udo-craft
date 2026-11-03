/** Volume discount applied to a single order line. Mirrors the storefront checkout summary. */
export function quantityDiscount(quantity: number): number {
  if (quantity >= 100) return 0.15;
  if (quantity >= 50) return 0.12;
  if (quantity >= 10) return 0.05;
  return 0;
}

export function lineTotalCents(basePriceCents: number, quantity: number): number {
  return basePriceCents * quantity * (1 - quantityDiscount(quantity));
}
