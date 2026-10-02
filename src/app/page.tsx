import Link from "next/link";
import { getHomeData } from "@/application/catalog/catalog";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getServices } from "@/integrations/container";

export default async function HomePage() {
  const { featured, categories } = await getHomeData(getServices());
  return (
    <>
      <section className="border-b border-line bg-brand-soft">
        <Container className="grid items-center gap-8 py-16 sm:py-24 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-widest text-brand">New season</p>
            <h1 className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Everyday goods, made well.</h1>
            <p className="max-w-lg text-lg text-ink/75">Considered apparel, home, accessories and tech: built to last and a pleasure to use.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/shop" size="lg">Shop the collection</ButtonLink>
              <ButtonLink href="/shop?category=Home" size="lg" variant="secondary">Explore Home</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {categories.length > 0 && (
        <Container className="py-14">
          <h2 className="mb-6 font-serif text-2xl font-semibold">Shop by category</h2>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category}>
                <Link href={`/shop?category=${encodeURIComponent(category)}`} className="flex h-28 items-end rounded-2xl border border-line bg-surface p-5 text-lg font-semibold transition-colors hover:border-ink">
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      {featured.length > 0 && (
        <Container className="py-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-2xl font-semibold">Featured</h2>
            <Link href="/shop" className="text-sm font-medium underline-offset-4 hover:underline">View all</Link>
          </div>
          <ProductGrid products={featured} label="Featured products" />
        </Container>
      )}
    </>
  );
}
