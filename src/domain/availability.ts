import type { Product } from "./entities";

export const LOW_STOCK_THRESHOLD = 5;

export type Availability = "in_stock" | "low_stock" | "out_of_stock" | "unavailable";

export function getAvailability(product: Pick<Product, "isActive" | "stockQuantity">): Availability {
  if (!product.isActive) return "unavailable";
  if (product.stockQuantity <= 0) return "out_of_stock";
  if (product.stockQuantity <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

export function canPurchase(product: Pick<Product, "isActive" | "stockQuantity">): boolean {
  const availability = getAvailability(product);
  return availability === "in_stock" || availability === "low_stock";
}

/** The most of a product one person may add: never more than the stock on hand. */
export function maxPurchasable(product: Pick<Product, "isActive" | "stockQuantity">): number {
  return canPurchase(product) ? product.stockQuantity : 0;
}
