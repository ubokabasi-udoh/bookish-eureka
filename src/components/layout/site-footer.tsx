import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getStoreBranding } from "@/lib/config";

const CATEGORIES = ["Apparel", "Home", "Accessories", "Tech"];

export function SiteFooter() {
  const store = getStoreBranding();
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-serif text-xl font-semibold">{store.name}</p>
          <p className="max-w-xs text-sm text-muted">Everyday goods, made well. Thoughtfully sourced apparel, home, accessories and tech.</p>
        </div>
        <nav aria-label="Shop categories" className="space-y-3 text-sm">
          <p className="font-semibold">Shop</p>
          <ul className="space-y-2 text-muted">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link className="hover:text-ink" href={`/shop?category=${c}`}>{c}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account" className="space-y-3 text-sm">
          <p className="font-semibold">Account</p>
          <ul className="space-y-2 text-muted">
            <li><Link className="hover:text-ink" href="/sign-in">Sign in</Link></li>
            <li><Link className="hover:text-ink" href="/cart">Cart</Link></li>
          </ul>
        </nav>
        <div className="space-y-3 text-sm">
          <p className="font-semibold">Contact</p>
          <a className="text-muted hover:text-ink" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a>
        </div>
      </Container>
      <div className="border-t border-line py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} {store.name}. Demo store: no real payments are taken.
      </div>
    </footer>
  );
}
