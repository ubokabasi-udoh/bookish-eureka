import { Search } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Container } from "@/components/ui/container";
import type { AuthUser } from "@/domain/entities";
import { getServices } from "@/integrations/container";
import { logger } from "@/lib/logger";
import { AuthMenu } from "./auth-menu";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=Apparel", label: "Apparel" },
  { href: "/shop?category=Home", label: "Home" },
  { href: "/shop?category=Accessories", label: "Accessories" },
  { href: "/shop?category=Tech", label: "Tech" },
];

async function currentUserOrNull(): Promise<AuthUser | null> {
  try {
    return await getServices().auth.getCurrentUser();
  } catch (error) {
    // A broken auth backend must not take the whole storefront down.
    logger.error("header.current_user_failed", { error });
    return null;
  }
}

export async function SiteHeader() {
  // Auth state is per-request, so everything under the root layout renders on demand (never at build time).
  await connection();
  const user = await currentUserOrNull();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <Container className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          Northline
        </Link>
        <nav aria-label="Primary" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:overflow-visible">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-ink/80 hover:bg-brand-soft hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <form action="/shop" role="search" className="relative hidden sm:block">
            <label htmlFor="header-search" className="sr-only">
              Search products
            </label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="header-search"
              name="q"
              type="search"
              placeholder="Search products"
              maxLength={80}
              className="h-10 w-56 rounded-full border border-line bg-surface pl-9 pr-4 text-sm placeholder:text-muted focus-visible:w-72"
            />
          </form>
          <AuthMenu user={user} />
        </div>
      </Container>
    </header>
  );
}
