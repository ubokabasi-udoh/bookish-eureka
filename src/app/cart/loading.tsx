import { Container } from "@/components/ui/container";

export default function CartLoading() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-8 h-10 w-56 animate-pulse rounded bg-line/60" />
      <div role="status" aria-live="polite" className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
        <span className="sr-only">Loading your cart…</span>
      </div>
    </Container>
  );
}