import type { Order, Product, Profile } from "@/domain/entities";
import { SEED_PRODUCTS, seedImageUrl } from "../seed-data";

export interface MemoryStore {
  products: Map<string, Product>;
  profiles: Map<string, Profile>;
  orders: Map<string, Order>;
}

const SEED_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export function createMemoryStore(): MemoryStore {
  const products = new Map<string, Product>();
  SEED_PRODUCTS.forEach((seed, index) => {
    const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    products.set(id, {
      id,
      sku: seed.sku,
      name: seed.name,
      slug: seed.slug,
      description: seed.description,
      priceCents: seed.priceCents,
      currency: "USD",
      imageUrl: seedImageUrl(seed.slug),
      category: seed.category,
      stockQuantity: seed.stockQuantity,
      isActive: true,
      isFeatured: seed.isFeatured,
      rating: seed.rating,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    });
  });
  return { products, profiles: new Map(), orders: new Map() };
}

const GLOBAL_KEY = Symbol.for("shop.memoryStore");

/** One store per server process, so state survives between requests (and hot reloads in dev). */
export function getSharedMemoryStore(): MemoryStore {
  const g = globalThis as unknown as Record<symbol, MemoryStore | undefined>;
  return (g[GLOBAL_KEY] ??= createMemoryStore());
}

export function resetSharedMemoryStore(): void {
  (globalThis as unknown as Record<symbol, MemoryStore | undefined>)[GLOBAL_KEY] = createMemoryStore();
}
