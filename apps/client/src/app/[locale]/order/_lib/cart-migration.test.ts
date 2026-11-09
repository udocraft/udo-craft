import { describe, expect, it } from "vitest";
import { migrateLegacyCheckoutCart } from "./cart-migration";

describe("migrateLegacyCheckoutCart", () => {
  it("preserves legacy cart details in the current order format", () => {
    expect(migrateLegacyCheckoutCart([{
      product: {
        id: "product-1",
        name: "Classic shirt",
        images: { front: "https://example.com/front.jpg" },
        base_price_cents: 42000,
      },
      size: "M",
      color: "Black",
      quantity: 12,
      mockupDataUrl: "data:image/png;base64,abc",
      offsetTopMm: 18,
    }])).toEqual([{
      productId: "product-1",
      productName: "Classic shirt",
      productImage: "https://example.com/front.jpg",
      productPrice: 42000,
      unitPriceCents: 42000,
      printCostCents: 0,
      quantity: 12,
      size: "M",
      color: "Black",
      layers: [],
      mockupDataUrl: "data:image/png;base64,abc",
      offsetTopMm: 18,
    }]);
  });

  it("rejects malformed or mixed legacy carts instead of dropping entries", () => {
    expect(migrateLegacyCheckoutCart({})).toBeNull();
    expect(migrateLegacyCheckoutCart([{ product: null }])).toBeNull();
    expect(migrateLegacyCheckoutCart([{
      product: { id: "product-1", name: "Classic shirt", images: {}, base_price_cents: 42000 },
      size: "M",
      color: "Black",
      quantity: 1.5,
    }])).toBeNull();
  });
});
