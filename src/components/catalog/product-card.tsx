import Image from "next/image";
import Link from "next/link";
import { canPurchase, maxPurchasable } from "@/domain/availability";
import type { Product } from "@/domain/entities";
import { QuickAddButton } from "@/features/cart/quick-add-button";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { StockBadge } from "./stock-badge";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow focus-within:shadow-md hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-brand-soft">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          unoptimized
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className={cn("object-cover transition-transform duration-300 group-hover:scale-[1.03]", !canPurchase(product) && "opacity-60")}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{product.category}</p>
        <h3 className="text-base font-semibold leading-snug">
          {/* Stretched link: the whole card is one tab stop with a clear accessible name. */}
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-offset-[-2px]">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <Price cents={product.priceCents} currency={product.currency} />
          <StockBadge product={product} />
        </div>
        <QuickAddButton productId={product.id} productName={product.name} maxQuantity={maxPurchasable(product)} />
      </div>
    </article>
  );
}
