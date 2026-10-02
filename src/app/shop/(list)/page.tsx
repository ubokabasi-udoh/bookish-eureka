import type { Metadata } from "next";
import Link from "next/link";
import { browseCatalog } from "@/application/catalog/catalog";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getServices } from "@/integrations/container";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const query = await searchParams;
  const { products, categories, search, category } = await browseCatalog(getServices(), {
    search: first(query.q),
    category: first(query.category),
  });
  const filtered = Boolean(search || category);

  const hrefFor = (cat: string | null) => {
    const p = new URLSearchParams();
    if (cat) p.set("category", cat);
    if (search) p.set("q", search);
    const qs = p.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8 space-y-2">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">{category ?? "Shop"}</h1>
        <p className="text-muted">
          {search ? `Results for “${search}”` : "Everyday goods, made well."}
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Categories" className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {[{ label: "All", value: null }, ...categories.map((c) => ({ label: c, value: c }))].map(({ label, value }) => {
            const active = (value ?? null) === (category ?? null);
            return (
              <Link
                key={label}
                href={hrefFor(value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-ink",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <form action="/shop" role="search" className="flex gap-2">
          {category && <input type="hidden" name="category" value={category} />}
          <label htmlFor="shop-search" className="sr-only">Search products</label>
          <input
            id="shop-search"
            name="q"
            type="search"
            defaultValue={search ?? ""}
            maxLength={80}
            placeholder="Search products"
            className="h-11 w-full rounded-full border border-line bg-surface px-5 text-sm placeholder:text-muted lg:w-72"
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </div>

      <p className="mb-4 text-sm text-muted" aria-live="polite">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>

      {products.length > 0 ? (
        <ProductGrid products={products} label="Products" />
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">{filtered ? "No products match your search" : "No products yet"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            {filtered ? "Try a different search term or browse every category." : "Check back soon: new arrivals are on the way."}
          </p>
          {filtered && (
            <ButtonLink href="/shop" variant="secondary" className="mt-6">Clear filters</ButtonLink>
          )}
        </div>
      )}
    </Container>
  );
}
