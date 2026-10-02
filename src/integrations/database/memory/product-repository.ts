import type { Product } from "@/domain/entities";
import type { ProductQuery, ProductRepository } from "@/domain/ports";
import { normalizeSearchTerm } from "@/domain/search";
import type { MemoryStore } from "./store";

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);
const byRatingThenName = (a: Product, b: Product) => (b.rating ?? 0) - (a.rating ?? 0) || byName(a, b);

export class MemoryProductRepository implements ProductRepository {
  constructor(private readonly store: MemoryStore) {}

  private active(): Product[] {
    return [...this.store.products.values()].filter((p) => p.isActive);
  }

  async list(query: ProductQuery = {}): Promise<Product[]> {
    const term = normalizeSearchTerm(query.search)?.toLowerCase();
    const category = query.category?.trim().toLowerCase();
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 48;
    return this.active()
      .filter((p) => !category || p.category.toLowerCase() === category)
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term))
      .sort(byName)
      .slice(offset, offset + limit);
  }

  async listFeatured(limit: number): Promise<Product[]> {
    return this.active().filter((p) => p.isFeatured).sort(byRatingThenName).slice(0, limit);
  }

  async listCategories(): Promise<string[]> {
    return [...new Set(this.active().map((p) => p.category))].sort((a, b) => a.localeCompare(b));
  }

  async getBySlug(slug: string): Promise<Product | null> {
    return this.active().find((p) => p.slug === slug) ?? null;
  }

  async getByIds(ids: string[]): Promise<Product[]> {
    const wanted = new Set(ids);
    return this.active().filter((p) => wanted.has(p.id));
  }

  async listRelated(product: Pick<Product, "id" | "category">, limit: number): Promise<Product[]> {
    return this.active()
      .filter((p) => p.category === product.category && p.id !== product.id)
      .sort(byRatingThenName)
      .slice(0, limit);
  }
}
