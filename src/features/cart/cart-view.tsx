"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Price } from "@/components/catalog/price";
import { formatMoney, DEFAULT_CURRENCY } from "@/domain/money";
import { QuantityStepper } from "./quantity-stepper";
import { useCartProducts } from "./use-cart-products";

function CartSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex animate-pulse gap-4">
            <div className="size-24 rounded-xl bg-line/60" />
            <div className="flex-1 space-y-3 py-2">
              <div className="h-4 w-1/2 rounded bg-line/60" />
              <div className="h-3 w-1/4 rounded bg-line/60" />
              <div className="h-9 w-32 rounded-full bg-line/60" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
      <span className="sr-only">Loading your cart…</span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h2 className="font-serif text-2xl font-semibold">Your cart is empty</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Once you add something you love, it will show up here.</p>
      <ButtonLink href="/shop" className="mt-6">
        Browse the shop
      </ButtonLink>
    </div>
  );
}

/** Full cart page: line editing, live stock reconciliation and the path into checkout. */
export function CartView() {
  const { hydrated, loading, failed, summary, setLineQuantity, remove } = useCartProducts();
  const currency = summary.currency ?? DEFAULT_CURRENCY;

  if (!hydrated || loading) return <CartSkeleton />;

  const isEmpty = summary.lines.length === 0 && summary.unavailable.length === 0;
  if (isEmpty) return <EmptyCart />;

  const blocked = summary.unavailable.length > 0;
  const canCheckout = !blocked && summary.totalQuantity > 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        {failed && (
          <p role="alert" className="mb-6 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            We couldn&rsquo;t refresh your cart from the shop. Prices shown may be out of date.
          </p>
        )}

        <ul className="divide-y divide-line border-y border-line">
          {summary.lines.map((line) => (
            <li key={line.productId} className="flex gap-4 py-6">
              <Link
                href={`/shop/${line.product.slug}`}
                className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-line bg-brand-soft"
              >
                <Image src={line.product.imageUrl} alt="" fill unoptimized sizes="96px" className="object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <h2 className="truncate font-medium">
                      <Link href={`/shop/${line.product.slug}`} className="hover:underline">
                        {line.product.name}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted">
                      {line.product.category} · <Price cents={line.unitPriceCents} currency={line.product.currency} />
                    </p>
                  </div>
                  <Price cents={line.subtotalCents} currency={line.product.currency} className="tabular-nums" />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    value={line.quantity}
                    max={line.maxQuantity}
                    onChange={(next) => setLineQuantity(line.productId, next, line.maxQuantity)}
                    label={line.product.name}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(line.productId)}
                    aria-label={`Remove ${line.product.name} from cart`}
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}

          {summary.unavailable.map((item) => (
            <li key={item.productId} className="flex flex-wrap items-start justify-between gap-4 py-6">
              <div className="flex min-w-0 items-start gap-3">
                <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
                <div>
                  <h2 className="font-medium">{item.productName ?? "A product in your cart"}</h2>
                  <p className="text-sm text-danger">
                    {item.reason === "out_of_stock"
                      ? "Out of stock — remove it to continue."
                      : "No longer available — remove it to continue."}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(item.productId)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>

        <ButtonLink href="/shop" variant="ghost" className="mt-6">
          Continue shopping
        </ButtonLink>
      </div>

      <aside aria-labelledby="cart-summary-heading" className="h-fit rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
        <h2 id="cart-summary-heading" className="font-serif text-xl font-semibold">
          Order summary
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
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

        {canCheckout ? (
          <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
            Proceed to checkout
          </ButtonLink>
        ) : (
          <>
            <Button size="lg" disabled className="mt-6 w-full">
              Proceed to checkout
            </Button>
            <p role="alert" className="mt-3 text-sm text-danger">
              Remove the unavailable {summary.unavailable.length === 1 ? "item" : "items"} above to continue.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}