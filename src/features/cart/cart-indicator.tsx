"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartItemCount } from "./cart-store";

/** Header cart affordance. The count is hidden until the persisted cart has hydrated. */
export function CartIndicator() {
  const { count, hydrated } = useCartItemCount();
  const label = hydrated && count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart";
  return (
    <Link
      href="/cart"
      aria-label={label}
      className="relative grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface transition-colors hover:border-ink"
    >
      <ShoppingBag aria-hidden className="size-5" />
      {hydrated && count > 0 && (
        <span aria-hidden className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold leading-5 tabular-nums text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}