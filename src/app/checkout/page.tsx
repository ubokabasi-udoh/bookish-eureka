import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CheckoutView } from "@/features/checkout/checkout-view";
import { getServices } from "@/integrations/container";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getServices()
    .auth.getCurrentUser()
    .catch((error) => {
      logger.error("checkout.current_user_failed", { error });
      return null;
    });

  // Sign-in first, then come straight back here. `next` is validated by safeRedirectPath on arrival.
  if (!user) redirect(`/sign-in?next=${encodeURIComponent("/checkout")}`);

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-8 font-serif text-4xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutView defaults={{ customerName: user.name ?? "", customerEmail: user.email }} />
    </Container>
  );
}