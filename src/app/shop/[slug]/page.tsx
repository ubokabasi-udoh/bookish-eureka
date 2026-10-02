import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getProductDetail } from "@/application/catalog/catalog";
import { Price } from "@/components/catalog/price";
import { ProductGrid } from "@/components/catalog/product-grid";
import { StockBadge } from "@/components/catalog/stock-badge";
import { Container } from "@/components/ui/container";
import { getServices } from "@/integrations/container";

// Shared by generateMetadata and the page so the database is queried once per request.
const loadProduct = cache((slug: string) => getProductDetail(getServices(), slug));

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadProduct(slug).catch(() => null);
  if (!detail) return { title: "Product not found" };
  return { title: detail.product.name, description: detail.product.description.slice(0, 160) };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const detail = await loadProduct(slug);
  if (!detail) notFound();
  const { product, related } = detail;

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link className="hover:text-ink" href="/shop">Shop</Link></li>
          <li aria-hidden>/</li>
          <li><Link className="hover:text-ink" href={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-brand-soft">
          <Image src={product.imageUrl} alt={product.name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>

        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{product.category}</p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight">{product.name}</h1>
            {product.rating !== null && (
              <p className="text-sm text-muted" aria-label={`Rated ${product.rating} out of 5`}>
                <span aria-hidden className="text-accent">★</span> {product.rating.toFixed(1)} / 5
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Price cents={product.priceCents} currency={product.currency} className="text-3xl" />
            <StockBadge product={product} showCount />
          </div>
          <p className="max-w-prose leading-relaxed text-ink/80">{product.description}</p>
          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm">
            <div><dt className="text-muted">Category</dt><dd className="font-medium">{product.category}</dd></div>
            {product.sku && <div><dt className="text-muted">SKU</dt><dd className="font-medium">{product.sku}</dd></div>}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-20">
          <h2 id="related-heading" className="mb-6 font-serif text-2xl font-semibold">You may also like</h2>
          <ProductGrid products={related} label="Related products" />
        </section>
      )}
    </Container>
  );
}
