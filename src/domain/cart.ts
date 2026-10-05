import { getAvailability } from "./availability";
import type { CartLineInput, Product } from "./entities";
import type { Cents } from "./money";

/** Re-exported so cart consumers do not need to reach into the entity module. */
export type { CartLineInput };

/**
 * Hard ceiling on any single line, independent of stock. Keeps a mistyped or tampered
 * quantity from blowing past what a real order can contain (mirrors the DB/RPC limits).
 */
export const MAX_LINE_QUANTITY = 99;

/** The largest quantity a line may hold: the stock on hand, capped by MAX_LINE_QUANTITY. */
export function maxLineQuantity(product: Pick<Product, "isActive" | "stockQuantity">): number {
  if (getAvailability(product) === "unavailable" || getAvailability(product) === "out_of_stock") return 0;
  return Math.min(product.stockQuantity, MAX_LINE_QUANTITY);
}

/** Turns any (possibly hostile) number into a whole quantity between 0 and `max`. */
export function clampQuantity(quantity: number, max: number): number {
  const ceiling = Math.max(0, Math.floor(max));
  if (!Number.isFinite(quantity)) return 0;
  const whole = Math.floor(quantity);
  if (whole <= 0) return 0;
  return Math.min(whole, ceiling, MAX_LINE_QUANTITY);
}

/**
 * Collapses duplicate product lines, drops non-positive quantities and ignores malformed entries.
 * Shared by the memory order repository so it matches the SQL function's dedup behaviour.
 */
export function normalizeCartLines(lines: readonly CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!line || typeof line.productId !== "string" || line.productId.length === 0) continue;
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + Math.floor(line.quantity || 0));
  }
  return [...merged.entries()]
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
}

/** Adds `quantity` to a line (creating it if needed), never exceeding `max`. */
export function addLine(lines: readonly CartLineInput[], productId: string, quantity: number, max: number): CartLineInput[] {
  const current = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const next = clampQuantity(current + quantity, max);
  if (next <= 0) return lines.filter((l) => l.productId !== productId);
  const others = lines.filter((l) => l.productId !== productId);
  return [...others, { productId, quantity: next }];
}

/** Sets an exact quantity, clamped to `[0, max]`; removes the line when it reaches 0. */
export function setQuantity(lines: readonly CartLineInput[], productId: string, quantity: number, max: number): CartLineInput[] {
  const next = clampQuantity(quantity, max);
  if (next <= 0) return lines.filter((l) => l.productId !== productId);
  const others = lines.filter((l) => l.productId !== productId);
  return [...others, { productId, quantity: next }];
}

export function removeLine(lines: readonly CartLineInput[], productId: string): CartLineInput[] {
  return lines.filter((l) => l.productId !== productId);
}

export function countItems(lines: readonly CartLineInput[]): number {
  return normalizeCartLines(lines).reduce((total, line) => total + line.quantity, 0);
}

export interface CartLineView {
  productId: string;
  product: Product;
  quantity: number;
  unitPriceCents: Cents;
  subtotalCents: Cents;
  /** Max the shopper may hold right now; drives the stepper's "+" disabled state. */
  maxQuantity: number;
}

export interface UnavailableCartLine {
  productId: string;
  /** Snapshot name when we know the product but it is inactive; null when it is gone entirely. */
  productName: string | null;
  reason: "unavailable" | "out_of_stock" | "missing";
}

export interface CartSummary {
  lines: CartLineView[];
  unavailable: UnavailableCartLine[];
  totalQuantity: number;
  subtotalCents: Cents;
  /** Currency of the first priced line, or null for an empty cart. Mixed currencies are not supported. */
  currency: string | null;
}

/**
 * Joins stored `{productId, quantity}` lines with authoritative product records.
 * Prices and stock come from the catalog, never from the browser.
 */
export function summarizeCart(lines: readonly CartLineInput[], products: readonly Product[]): CartSummary {
  const byId = new Map(products.map((p) => [p.id, p]));
  const priced: CartLineView[] = [];
  const unavailable: UnavailableCartLine[] = [];

  for (const line of normalizeCartLines(lines)) {
    const product = byId.get(line.productId);
    if (!product) {
      unavailable.push({ productId: line.productId, productName: null, reason: "missing" });
      continue;
    }
    const maxQuantity = maxLineQuantity(product);
    if (maxQuantity === 0) {
      const reason = getAvailability(product) === "unavailable" ? "unavailable" : "out_of_stock";
      unavailable.push({ productId: line.productId, productName: product.name, reason });
      continue;
    }
    const quantity = clampQuantity(line.quantity, maxQuantity);
    priced.push({
      productId: line.productId,
      product,
      quantity,
      unitPriceCents: product.priceCents,
      subtotalCents: product.priceCents * quantity,
      maxQuantity,
    });
  }

  return {
    lines: priced,
    unavailable,
    totalQuantity: priced.reduce((total, line) => total + line.quantity, 0),
    subtotalCents: priced.reduce((total, line) => total + line.subtotalCents, 0),
    currency: priced[0]?.product.currency ?? null,
  };
}

/** Only the ids and quantities the server may receive. Drops everything else the store holds. */
export function toOrderLines(summary: CartSummary): CartLineInput[] {
  return summary.lines.map((line) => ({ productId: line.productId, quantity: line.quantity }));
}