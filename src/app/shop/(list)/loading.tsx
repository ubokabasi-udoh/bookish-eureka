import { ProductGridSkeleton } from "@/components/catalog/product-grid";
import { Container } from "@/components/ui/container";

export default function ShopLoading() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-10 h-10 w-48 animate-pulse rounded bg-line/60" />
      <ProductGridSkeleton />
    </Container>
  );
}
