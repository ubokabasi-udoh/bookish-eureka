"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "./quantity-stepper";
import { addToCart, useCartLines } from "./cart-store";

/**
 * Product-page purchase controls. The quantity can never exceed live stock, and the shopper gets
 * immediate feedback plus a persistent link into the cart.
 */
export function AddToCart({
  productId,
  productName,
  maxQuantity,
  unavailableReason,
}: {
  productId: string;
  productName: string;
  maxQuantity: number;
  unavailableReason: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const lines = useCartLines();
  const inCart = lines.find((line) => line.productId === productId)?.quantity ?? 0;
  const soldOut = maxQuantity <= 0;

  function handleAdd() {
    const total = addToCart(productId, quantity, maxQuantity);
    toast.success(`${productName} added to your cart`, {
      description: `Quantity in cart: ${total}`,
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  }

  if (soldOut) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled aria-disabled="true">
          {unavailableReason}
        </Button>
        <Link href="/shop" className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
          Browse other products
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <QuantityStepper value={Math.min(quantity, maxQuantity)} max={maxQuantity} onChange={setQuantity} label="Quantity" />
      <Button size="lg" onClick={handleAdd}>
        <ShoppingBag aria-hidden className="size-5" />
        Add to cart
      </Button>
      {inCart > 0 && (
        <p className="text-sm text-muted" aria-live="polite">
          {inCart} in your cart ·{" "}
          <Link href="/cart" className="font-medium text-ink underline-offset-4 hover:underline">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}