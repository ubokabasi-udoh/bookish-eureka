"use client";

import { useEffect, useMemo, useState } from "react";
import { summarizeCart, type CartSummary } from "@/domain/cart";
import type { CartLineInput, Product } from "@/domain/entities";
import { loadCartProducts } from "./cart-actions";
import { useCartActions, useCartHydrated, useCartLines } from "./cart-store";

/** Stable reference for "cart resolves to no products", keeping downstream memos calm. */
const EMPTY_PRODUCTS: Product[] = [];

export interface CartProductsResult {
  lines: CartLineInput[];
  /** False until localStorage has been read; render placeholders while false. */
  hydrated: boolean;
  /** Null while the products are still loading. */
  products: Product[] | null;
  summary: CartSummary;
  loading: boolean;
  failed: boolean;
  setLineQuantity: (productId: string, quantity: number, max: number) => void;
  remove: (productId: string) => void;
}

/**
 * Loads the cart from localStorage, resolves each id against the catalog (authoritative price and
 * stock), and reconciles the stored quantities with what is actually available.
 */
export function useCartProducts(): CartProductsResult {
  const lines = useCartLines();
  const hydrated = useCartHydrated();
  const { setLineQuantity, remove } = useCartActions();
  // The key is stored with the result so a response for an older cart is never rendered.
  const [loaded, setLoaded] = useState<{ key: string; products: Product[]; failed: boolean } | null>(null);

  const idsKey = useMemo(() => lines.map((line) => line.productId).sort().join(","), [lines]);

  useEffect(() => {
    if (!hydrated || !idsKey) return;
    let cancelled = false;
    loadCartProducts(idsKey.split(",")).then(
      (next) => {
        if (!cancelled) setLoaded({ key: idsKey, products: next, failed: false });
      },
      () => {
        if (!cancelled) setLoaded({ key: idsKey, products: [], failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [idsKey, hydrated]);

  // `loaded.key` guards against rendering a response for an older cart; `EMPTY_PRODUCTS` keeps the
  // reference stable for the empty case so the memo/effect dependencies below do not churn.
  const products = useMemo(
    () => (idsKey ? (loaded && loaded.key === idsKey ? loaded.products : null) : EMPTY_PRODUCTS),
    [loaded, idsKey],
  );
  const failed = Boolean(loaded && loaded.key === idsKey && loaded.failed);

  const summary = useMemo(() => summarizeCart(lines, products ?? []), [lines, products]);

  // Clamp stored quantities to live stock and drop products that no longer exist at all.
  useEffect(() => {
    if (!products) return;
    const stored = new Map(lines.map((line) => [line.productId, line.quantity]));
    for (const line of summary.lines) {
      if (stored.get(line.productId) !== line.quantity) setLineQuantity(line.productId, line.quantity, line.maxQuantity);
    }
    for (const gone of summary.unavailable) {
      if (gone.reason === "missing") remove(gone.productId);
    }
  }, [products, lines, summary, setLineQuantity, remove]);

  return {
    lines,
    hydrated,
    products,
    summary,
    loading: hydrated && Boolean(idsKey) && products === null,
    failed,
    setLineQuantity,
    remove,
  };
}