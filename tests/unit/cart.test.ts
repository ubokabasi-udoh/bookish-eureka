import { describe, expect, it } from "vitest";
import {
  addLine,
  clampQuantity,
  countItems,
  MAX_LINE_QUANTITY,
  maxLineQuantity,
  normalizeCartLines,
  removeLine,
  setQuantity,
  summarizeCart,
  toOrderLines,
} from "@/domain/cart";
import type { Product } from "@/domain/entities";

function product(overrides: Partial<Product> & Pick<Product, "id">): Product {
  return {
    sku: null,
    name: "Thing",
    slug: "thing",
    description: "",
    priceCents: 1000,
    currency: "USD",
    imageUrl: "/products/thing.svg",
    category: "Home",
    stockQuantity: 10,
    isActive: true,
    isFeatured: false,
    rating: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("cart quantities", () => {
  it("caps a line at the stock on hand and at the per-line ceiling", () => {
    expect(maxLineQuantity(product({ id: "a", stockQuantity: 7 }))).toBe(7);
    expect(maxLineQuantity(product({ id: "b", stockQuantity: 500 }))).toBe(MAX_LINE_QUANTITY);
  });

  it("never offers a purchasable quantity for unavailable or out-of-stock products", () => {
    expect(maxLineQuantity(product({ id: "a", stockQuantity: 0 }))).toBe(0);
    expect(maxLineQuantity(product({ id: "b", stockQuantity: 5, isActive: false }))).toBe(0);
  });

  it("clamps hostile numeric input into [0, max]", () => {
    expect(clampQuantity(3, 10)).toBe(3);
    expect(clampQuantity(30, 10)).toBe(10);
    expect(clampQuantity(2.9, 10)).toBe(2);
    expect(clampQuantity(-4, 10)).toBe(0);
    expect(clampQuantity(Number.NaN, 10)).toBe(0);
    expect(clampQuantity(Number.POSITIVE_INFINITY, 10)).toBe(0);
    expect(clampQuantity(4, 0)).toBe(0);
  });

  it("adds to an existing line without exceeding the cap", () => {
    expect(addLine([], "a", 2, 5)).toEqual([{ productId: "a", quantity: 2 }]);
    expect(addLine([{ productId: "a", quantity: 4 }], "a", 3, 5)).toEqual([{ productId: "a", quantity: 5 }]);
    expect(addLine([{ productId: "a", quantity: 1 }], "a", 0, 5)).toEqual([{ productId: "a", quantity: 1 }]);
  });

  it("drops the line when an addition or set would fall to zero or below", () => {
    expect(addLine([{ productId: "a", quantity: 1 }], "a", -5, 5)).toEqual([]);
    expect(setQuantity([{ productId: "a", quantity: 2 }], "a", 0, 5)).toEqual([]);
    expect(setQuantity([{ productId: "a", quantity: 2 }], "a", -1, 5)).toEqual([]);
  });

  it("sets an exact quantity clamped to the cap", () => {
    expect(setQuantity([{ productId: "a", quantity: 2 }], "a", 4, 5)).toEqual([{ productId: "a", quantity: 4 }]);
    expect(setQuantity([{ productId: "a", quantity: 2 }], "a", 99, 5)).toEqual([{ productId: "a", quantity: 5 }]);
  });

  it("removes lines and counts only positive quantities", () => {
    const lines = [{ productId: "a", quantity: 2 }, { productId: "b", quantity: 3 }];
    expect(removeLine(lines, "a")).toEqual([{ productId: "b", quantity: 3 }]);
    expect(countItems(lines)).toBe(5);
    expect(countItems([])).toBe(0);
  });

  it("collapses duplicate lines and ignores malformed entries", () => {
    expect(
      normalizeCartLines([
        { productId: "a", quantity: 1 },
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: 0 },
        { productId: "", quantity: 3 },
      ]),
    ).toEqual([{ productId: "a", quantity: 3 }]);
  });
});

describe("summarizeCart", () => {
  const sweater = product({ id: "sweater", name: "Sweater", priceCents: 12900, stockQuantity: 24 });
  const candle = product({ id: "candle", name: "Candle", priceCents: 2800, stockQuantity: 3 });
  const plates = product({ id: "plates", name: "Plates", priceCents: 7200, stockQuantity: 0 });

  it("prices lines from the catalog, never from the stored line", () => {
    const summary = summarizeCart([{ productId: "sweater", quantity: 2 }], [sweater]);
    expect(summary.lines[0]).toMatchObject({ unitPriceCents: 12900, subtotalCents: 25800, quantity: 2 });
    expect(summary.subtotalCents).toBe(25800);
    expect(summary.totalQuantity).toBe(2);
    expect(summary.currency).toBe("USD");
  });

  it("clamps a stored quantity to the live stock", () => {
    const summary = summarizeCart([{ productId: "candle", quantity: 99 }], [candle]);
    expect(summary.lines[0].quantity).toBe(3);
    expect(summary.lines[0].maxQuantity).toBe(3);
    expect(summary.subtotalCents).toBe(8400);
  });

  it("separates out-of-stock, inactive and deleted products from purchasable lines", () => {
    const summary = summarizeCart(
      [
        { productId: "plates", quantity: 1 },
        { productId: "inactive", quantity: 1 },
        { productId: "ghost", quantity: 1 },
        { productId: "sweater", quantity: 1 },
      ],
      [plates, product({ id: "inactive", isActive: false, stockQuantity: 5 }), sweater],
    );
    expect(summary.lines.map((l) => l.productId)).toEqual(["sweater"]);
    expect(summary.unavailable).toEqual([
      { productId: "plates", productName: "Plates", reason: "out_of_stock" },
      { productId: "inactive", productName: "Thing", reason: "unavailable" },
      { productId: "ghost", productName: null, reason: "missing" },
    ]);
    expect(summary.subtotalCents).toBe(12900);
  });

  it("returns an empty currency for an empty cart and strips everything but ids and quantities", () => {
    const summary = summarizeCart([{ productId: "candle", quantity: 2 }], [candle]);
    expect(summarizeCart([], []).currency).toBeNull();
    expect(toOrderLines(summary)).toEqual([{ productId: "candle", quantity: 2 }]);
    expect(Object.keys(toOrderLines(summary)[0]).sort()).toEqual(["productId", "quantity"]);
  });
});