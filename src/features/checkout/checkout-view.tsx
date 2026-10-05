"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Price } from "@/components/catalog/price";
import { ButtonLink } from "@/components/ui/button";
import { toOrderLines } from "@/domain/cart";
import { DEFAULT_CURRENCY, formatMoney } from "@/domain/money";
import { useCartProducts } from "@/features/cart/use-cart-products";
import { CheckoutForm } from "./checkout-form";

function CheckoutSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="h-96 animate-pulse rounded-2xl border border-line bg-surface" />
      <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
      <span className="sr-only">Loading your details…</span>
    </div>
  );
}

/**
 * Checkout: read-only order summary on the right, validated form on the left. The summary is
 * display-only — the server recomputes prices and stock when the order is placed.
 */
export function CheckoutView({ defaults }: { defaults: { customerName: string; customerEmail: string } }) {
  const { hydrated, loading, summary } = useCartProducts();
  const currency = summary.currency ?? DEFAULT_CURRENCY;

  if (!hydrated || loading) return <CheckoutSkeleton />;

  if (summary.lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <h2 className="font-serif text-2xl font-semibold">There is nothing to check out</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Add a product to your cart and head back here.</p>
        <ButtonLink href="/shop" className="mt-6">
          Browse the shop
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="order-2 lg:order-1">
        {summary.unavailable.length > 0 && (
          <div role="alert" className="mb-8 flex items-start gap-3 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
            <p>
              Some items are no longer available ({summary.unavailable.map((i) => i.productName ?? "a product").join(", ")}).{" "}
              <Link href="/cart" className="font-medium underline">
                Update your cart
              </Link>{" "}
              before placing the order.
            </p>
          </div>
        )}
        <CheckoutForm items={toOrderLines(summary)} defaults={defaults} />
      </div>

      <aside aria-labelledby="checkout-summary-heading" className="order-1 h-fit rounded-2xl border border-line bg-surface p-6 lg:order-2 lg:sticky lg:top-24">
        <h2 id="checkout-summary-heading" className="font-serif text-xl font-semibold">
          Order summary
        </h2>
        <ul className="mt-4 divide-y divide-line">
          {summary.lines.map((line) => (
            <li key={line.productId} className="flex gap-3 py-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-brand-soft">
                <Image src={line.product.imageUrl} alt="" fill unoptimized sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.product.name}</p>
                <p className="text-xs text-muted">Qty {line.quantity}</p>
              </div>
              <Price cents={line.subtotalCents} currency={line.product.currency} className="text-sm tabular-nums" />
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Items</dt>
            <dd className="tabular-nums">{summary.totalQuantity}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(summary.subtotalCents, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd className="text-muted">Free</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(summary.subtotalCents, currency)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          The final total is calculated on the server from the current catalog prices when you place the order.
        </p>
        <Link href="/cart" className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline">
          Edit cart
        </Link>
      </aside>
    </div>
  );
}