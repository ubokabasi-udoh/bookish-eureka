import { describe, expect, it } from "vitest";
import { mapProductRow, productRowSchema } from "@/integrations/database/mappers";

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  sku: null,
  name: "Thing",
  slug: "thing",
  description: "d",
  price_cents: 1234,
  currency: "USD",
  image_url: "/products/thing.svg",
  category: "Home",
  stock_quantity: 3,
  is_active: true,
  is_featured: false,
  rating: 4.5,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("product row mapping", () => {
  it("maps snake_case rows to domain products", () => {
    expect(mapProductRow(productRowSchema.parse(row))).toMatchObject({ priceCents: 1234, imageUrl: "/products/thing.svg", stockQuantity: 3, isActive: true });
  });

  it("trims padded char(3) currency values", () => {
    expect(mapProductRow(productRowSchema.parse({ ...row, currency: "USD " })).currency).toBe("USD");
  });

  it("rejects rows with an unexpected shape instead of passing bad data on", () => {
    expect(productRowSchema.safeParse({ ...row, price_cents: "12.34" }).success).toBe(false);
    expect(productRowSchema.safeParse({ ...row, name: undefined }).success).toBe(false);
  });
});
