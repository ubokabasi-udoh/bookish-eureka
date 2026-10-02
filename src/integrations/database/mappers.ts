import { z } from "zod";
import type { Product, Profile } from "@/domain/entities";

export const productRowSchema = z.object({
  id: z.string(),
  sku: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price_cents: z.number().int(),
  currency: z.string(),
  image_url: z.string(),
  category: z.string(),
  stock_quantity: z.number().int(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  rating: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProductRow = z.infer<typeof productRowSchema>;

export const PRODUCT_COLUMNS =
  "id, sku, name, slug, description, price_cents, currency, image_url, category, stock_quantity, is_active, is_featured, rating, created_at, updated_at";

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceCents: row.price_cents,
    currency: row.currency.trim(),
    imageUrl: row.image_url,
    category: row.category,
    stockQuantity: row.stock_quantity,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const profileRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});
export type ProfileRow = z.infer<typeof profileRowSchema>;

export function mapProfileRow(row: ProfileRow): Profile {
  return { id: row.id, email: row.email, fullName: row.full_name, avatarUrl: row.avatar_url };
}
