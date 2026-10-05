"use client";

import { useCallback, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addLine, countItems, removeLine, setQuantity } from "@/domain/cart";
import type { CartLineInput } from "@/domain/entities";

/** Persisted shape: ids and quantities only. Prices and stock are never stored client-side. */
interface PersistedCart {
  lines: CartLineInput[];
}

export interface CartState extends PersistedCart {
  add: (productId: string, quantity: number, max: number) => void;
  setQuantity: (productId: string, quantity: number, max: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const CART_STORAGE_KEY = "northline.cart.v1";

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], PersistedCart>(
    (set) => ({
      lines: [],
      add: (productId, quantity, max) => set((state) => ({ lines: addLine(state.lines, productId, quantity, max) })),
      setQuantity: (productId, quantity, max) => set((state) => ({ lines: setQuantity(state.lines, productId, quantity, max) })),
      remove: (productId) => set((state) => ({ lines: removeLine(state.lines, productId) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

const EMPTY_LINES: CartLineInput[] = [];
const subscribe = (onChange: () => void) => useCartStore.subscribe(onChange);
const getClientLines = () => useCartStore.getState().lines;
const getServerLines = () => EMPTY_LINES;

/**
 * Hydration-safe read of the persisted cart. The server snapshot is always empty, so the
 * server HTML and the first client render agree; the real cart appears immediately after hydration.
 */
export function useCartLines(): CartLineInput[] {
  return useSyncExternalStore(subscribe, getClientLines, getServerLines);
}

const getHydrated = () => useCartStore.persist.hasHydrated();
const getNeverHydrated = () => false;
const subscribeHydration = (onChange: () => void) => {
  const offFinish = useCartStore.persist.onFinishHydration(onChange);
  const offStart = useCartStore.persist.onHydrate(onChange);
  return () => {
    offFinish();
    offStart();
  };
};

/** False during SSR and the first client render, true once localStorage has been read. */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, getHydrated, getNeverHydrated);
}

export function useCartItemCount(): { count: number; hydrated: boolean } {
  const lines = useCartLines();
  const hydrated = useCartHydrated();
  return { count: countItems(lines), hydrated };
}

/** Adds a product and reports the resulting quantity, so callers can show a toast. */
export function addToCart(productId: string, quantity: number, max: number): number {
  useCartStore.getState().add(productId, quantity, max);
  return useCartStore.getState().lines.find((line) => line.productId === productId)?.quantity ?? 0;
}

/** Stable callbacks for the cart page, backed by the store's imperative API. */
export function useCartActions() {
  const setLineQuantity = useCallback((productId: string, quantity: number, max: number) => {
    useCartStore.getState().setQuantity(productId, quantity, max);
  }, []);
  const remove = useCallback((productId: string) => {
    useCartStore.getState().remove(productId);
  }, []);
  const clear = useCallback(() => {
    useCartStore.getState().clear();
  }, []);
  return { setLineQuantity, remove, clear };
}