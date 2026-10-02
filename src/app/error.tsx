"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The server has already logged details; the digest lets support correlate this report.
    console.error("Route error", error.digest);
  }, [error]);

  return (
    <Container className="py-24 text-center">
      <h1 className="font-serif text-4xl font-semibold">Something went wrong</h1>
      <p role="alert" className="mx-auto mt-4 max-w-md text-muted">
        We couldn&rsquo;t load this page. This is usually temporary: please try again.
        {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">Go home</ButtonLink>
      </div>
    </Container>
  );
}
