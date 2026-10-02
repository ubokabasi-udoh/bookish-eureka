import type { Product } from "@/domain/entities";
import { normalizeSearchTerm } from "@/domain/search";
import type { Services } from "../services";

export interface ShopPage {
  products: Product[];
  categories: string[];
  search: string | null;
  category: string | null;
}

export async function browseCatalog(
  services: Pick<Services, "products">,
  input: { search?: string | null; category?: string | null },
): Promise<ShopPage> {
  const search = normalizeSearchTerm(input.search);
  const requested = input.category?.trim() || null;
  const [categories, products] = await Promise.all([
    services.products.listCategories(),
    services.products.list({ search: search ?? undefined, category: requested ?? undefined }),
  ]);
  // Ignore categories that don't exist rather than showing a misleading filter.
  const category = requested ? (categories.find((c) => c.toLowerCase() === requested.toLowerCase()) ?? null) : null;
  return { products: category || !requested ? products : [], categories, search, category: category ?? requested };
}

export async function getProductDetail(services: Pick<Services, "products">, slug: string) {
  const product = await services.products.getBySlug(slug);
  if (!product) return null;
  const related = await services.products.listRelated(product, 4);
  return { product, related };
}

export async function getHomeData(services: Pick<Services, "products">) {
  const [featured, categories] = await Promise.all([services.products.listFeatured(8), services.products.listCategories()]);
  return { featured, categories };
}
