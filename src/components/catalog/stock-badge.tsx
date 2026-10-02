import { getAvailability } from "@/domain/availability";
import type { Product } from "@/domain/entities";
import { cn } from "@/lib/utils";

const LABEL = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  unavailable: "Unavailable",
} as const;
const STYLE = {
  in_stock: "bg-brand-soft text-brand",
  low_stock: "bg-warning-soft text-warning",
  out_of_stock: "bg-danger-soft text-danger",
  unavailable: "bg-danger-soft text-danger",
} as const;

export function StockBadge({ product, showCount = false, className }: { product: Pick<Product, "isActive" | "stockQuantity">; showCount?: boolean; className?: string }) {
  const availability = getAvailability(product);
  const text = availability === "low_stock" && showCount ? `Only ${product.stockQuantity} left` : LABEL[availability];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLE[availability], className)}>{text}</span>;
}
