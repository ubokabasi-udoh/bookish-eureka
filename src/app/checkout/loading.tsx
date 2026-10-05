import { Container } from "@/components/ui/container";

export default function CheckoutLoading() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-8 h-10 w-64 animate-pulse rounded bg-line/60" />
      <div role="status" aria-live="polite" className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="h-96 animate-pulse rounded-2xl border border-line bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
        <span className="sr-only">Loading checkout…</span>
      </div>
    </Container>
  );
}