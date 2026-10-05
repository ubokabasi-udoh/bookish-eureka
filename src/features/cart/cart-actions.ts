"use server";

import { getProductsByIds } from "@/application/catalog/catalog";
import type { Product } from "@/domain/entities";
import { getServices } from "@/integrations/container";
import { logger } from "@/lib/logger";

/**
 * Resolves the browser's stored cart ids to products (with authoritative prices and stock).
 * The client never sends or receives a price of its own — it only asks about ids it already holds.
 */
export async function loadCartProducts(productIds: unknown): Promise<Product[]> {
  try {
    return await getProductsByIds(getServices(), productIds);
  } catch (error) {
    logger.error("cart.load_products_failed", { error });
    return [];
  }
}