"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addToCart } from "./cart-store";

/** Compact "add one" control for product cards. Hidden when the product cannot be bought. */
export function QuickAddButton({
  productId,
  productName,
  maxQuantity,
}: {
  productId: string;
  productName: string;
  maxQuantity: number;
}) {
  if (maxQuantity <= 0) return null;
  return (
    <button
      type="button"
      // Sits above the card's stretched link so it stays independently clickable.
      className="relative z-10 mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-line bg-surface text-sm font-medium transition-colors hover:border-ink focus-visible:outline-2"
      onClick={() => {
        const total = addToCart(productId, 1, maxQuantity);
        toast.success(`${productName} added to your cart`, { description: `Quantity in cart: ${total}` });
      }}
    >
      <Plus aria-hidden className="size-4" />
      Add to cart
      <span className="sr-only"> — {productName}</span>
    </button>
  );
}