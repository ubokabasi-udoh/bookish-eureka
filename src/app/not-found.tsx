import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">404</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">We can&rsquo;t find that page</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">The link may be broken, or the product may no longer be available.</p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/shop">Browse the shop</ButtonLink>
        <ButtonLink href="/" variant="secondary">Go home</ButtonLink>
      </div>
    </Container>
  );
}
