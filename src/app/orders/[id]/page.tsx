import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, MailWarning } from "lucide-react";
import { getOrderForUser } from "@/application/orders/place-order";
import { Price } from "@/components/catalog/price";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatMoney } from "@/domain/money";
import { getServices } from "@/integrations/container";
import { getStoreBranding } from "@/lib/config";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const services = getServices();

  const user = await services.auth
    .getCurrentUser()
    .catch((error) => {
      logger.error("orders.current_user_failed", { error });
      return null;
    });
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/orders/${id}`)}`);

  // getByIdForUser is scoped to the signed-in user, so another person's order is a 404, not a leak.
  const order = await getOrderForUser(services, id, user.id);
  if (!order) notFound();

  const store = getStoreBranding();
  const address = order.shippingAddress;

  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-4 rounded-2xl border border-line bg-brand-soft p-6">
          <CheckCircle2 aria-hidden className="mt-0.5 size-7 shrink-0 text-brand" />
          <div>
            <h1 className="font-serif text-3xl font-semibold">Thank you, {order.customerName.split(" ")[0]}!</h1>
            <p className="mt-1 text-sm text-ink/75">
              Your order is confirmed. Keep the reference below for your records.
            </p>
            <p className="mt-3 break-all font-mono text-sm font-medium">{order.id}</p>
          </div>
        </div>

        <p aria-live="polite" className="mt-6 flex items-start gap-2 text-sm">
          {order.emailStatus === "failed" ? (
            <>
              <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              <span className="text-warning">
                Your order is confirmed, but we couldn&rsquo;t send the confirmation email. Our team has been notified.
              </span>
            </>
          ) : (
            <span className="text-muted">
              A confirmation email is on its way to {order.customerEmail}. Questions? Contact{" "}
              <a className="underline" href={`mailto:${store.supportEmail}`}>
                {store.supportEmail}
              </a>
              .
            </span>
          )}
        </p>

        <section aria-labelledby="items-heading" className="mt-10">
          <h2 id="items-heading" className="font-serif text-xl font-semibold">
            Items
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="text-sm text-muted">
                    {item.quantity} × <Price cents={item.unitPriceCents} currency={order.currency} />
                  </p>
                </div>
                <Price cents={item.subtotalCents} currency={order.currency} />
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotalCents, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd className="text-muted">Free</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(order.totalCents, order.currency)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="shipping-heading" className="mt-10">
          <h2 id="shipping-heading" className="font-serif text-xl font-semibold">
            Shipping to
          </h2>
          <address className="mt-2 text-sm not-italic leading-relaxed text-muted">
            {order.customerName}
            <br />
            {address.line1}
            {address.line2 && <><br />{address.line2}</>}
            <br />
            {address.city}, {address.region} {address.postalCode}
            <br />
            {address.country}
            {order.customerPhone && <><br />{order.customerPhone}</>}
          </address>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/shop">Continue shopping</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
        </div>

        <p className="mt-8 text-xs text-muted">
          This is a demo store: no payment was taken and nothing will be shipped.{" "}
          <Link href="/" className="underline">
            {store.name}
          </Link>
        </p>
      </div>
    </Container>
  );
}