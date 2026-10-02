import type { Product } from "@/domain/entities";
import { ProductCard } from "./product-card";

export function ProductGrid({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading products" className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="aspect-square bg-line/60" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-1/3 rounded bg-line/60" />
            <div className="h-4 w-4/5 rounded bg-line/60" />
            <div className="h-4 w-1/4 rounded bg-line/60" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading products…</span>
    </div>
  );
}
