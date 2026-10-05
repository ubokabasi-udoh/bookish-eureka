import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { CartView } from "@/features/cart/cart-view";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="mb-8 font-serif text-4xl font-semibold tracking-tight">Your cart</h1>
      <CartView />
    </Container>
  );
}