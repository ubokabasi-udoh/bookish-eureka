import type { Product } from "../entities";

export interface ProductQuery {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

/** Read access to the catalog. Implementations return only active products unless stated. */
export interface ProductRepository {
  list(query?: ProductQuery): Promise<Product[]>;
  listFeatured(limit: number): Promise<Product[]>;
  listCategories(): Promise<string[]>;
  getBySlug(slug: string): Promise<Product | null>;
  /** Returns products for the given ids, INCLUDING inactive ones, so callers can report them accurately. */
  getByIds(ids: string[]): Promise<Product[]>;
  listRelated(product: Pick<Product, "id" | "category">, limit: number): Promise<Product[]>;
}
