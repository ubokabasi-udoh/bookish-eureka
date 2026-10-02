import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Product } from "@/domain/entities";
import { RepositoryError } from "@/domain/errors";
import type { ProductQuery, ProductRepository } from "@/domain/ports";
import { normalizeSearchTerm } from "@/domain/search";
import { mapProductRow, PRODUCT_COLUMNS, productRowSchema } from "../mappers";

const rowsSchema = z.array(productRowSchema);

/** Reads products through the anon key; RLS guarantees only active rows are visible. */
export class SupabaseProductRepository implements ProductRepository {
  constructor(private readonly client: SupabaseClient) {}

  private parse(data: unknown, op: string): Product[] {
    const parsed = rowsSchema.safeParse(data);
    if (!parsed.success) throw new RepositoryError(`Unexpected product data shape during ${op}.`, parsed.error);
    return parsed.data.map(mapProductRow);
  }

  private fail(op: string, error: { message: string }): never {
    throw new RepositoryError(`Product query failed (${op}).`, new Error(error.message));
  }

  async list(query: ProductQuery = {}): Promise<Product[]> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 48;
    let q = this.client.from("products").select(PRODUCT_COLUMNS).eq("is_active", true);
    const category = query.category?.trim();
    if (category) q = q.ilike("category", category.replace(/[%_\\]/g, "\\$&"));
    const term = normalizeSearchTerm(query.search);
    if (term) q = q.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
    const { data, error } = await q.order("name").range(offset, offset + limit - 1);
    if (error) this.fail("list", error);
    return this.parse(data, "list");
  }

  async listFeatured(limit: number): Promise<Product[]> {
    const { data, error } = await this.client
      .from("products").select(PRODUCT_COLUMNS)
      .eq("is_active", true).eq("is_featured", true)
      .order("rating", { ascending: false, nullsFirst: false }).order("name").limit(limit);
    if (error) this.fail("listFeatured", error);
    return this.parse(data, "listFeatured");
  }

  async listCategories(): Promise<string[]> {
    const { data, error } = await this.client.from("products").select("category").eq("is_active", true);
    if (error) this.fail("listCategories", error);
    const parsed = z.array(z.object({ category: z.string() })).safeParse(data);
    if (!parsed.success) throw new RepositoryError("Unexpected category data shape.", parsed.error);
    return [...new Set(parsed.data.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
  }

  async getBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from("products").select(PRODUCT_COLUMNS).eq("is_active", true).eq("slug", slug).maybeSingle();
    if (error) this.fail("getBySlug", error);
    return data ? this.parse([data], "getBySlug")[0] : null;
  }

  async getByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.client.from("products").select(PRODUCT_COLUMNS).eq("is_active", true).in("id", ids);
    if (error) this.fail("getByIds", error);
    return this.parse(data, "getByIds");
  }

  async listRelated(product: Pick<Product, "id" | "category">, limit: number): Promise<Product[]> {
    const { data, error } = await this.client
      .from("products").select(PRODUCT_COLUMNS)
      .eq("is_active", true).eq("category", product.category).neq("id", product.id)
      .order("rating", { ascending: false, nullsFirst: false }).order("name").limit(limit);
    if (error) this.fail("listRelated", error);
    return this.parse(data, "listRelated");
  }
}
