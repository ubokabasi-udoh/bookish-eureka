import { z } from "zod";
import type { Order, OrderItem, Product, Profile } from "@/domain/entities";

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

export const orderRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  status: z.enum(["confirmed", "cancelled"]),
  subtotal_cents: z.number().int(),
  total_cents: z.number().int(),
  currency: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string().nullable(),
  shipping_line1: z.string(),
  shipping_line2: z.string().nullable(),
  shipping_city: z.string(),
  shipping_region: z.string(),
  shipping_postal_code: z.string(),
  shipping_country: z.string(),
  email_status: z.enum(["pending", "sent", "failed"]),
  email_error: z.string().nullable(),
  email_sent_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type OrderRow = z.infer<typeof orderRowSchema>;

export const orderItemRowSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  product_id: z.string().nullable(),
  product_name: z.string(),
  unit_price_cents: z.number().int(),
  quantity: z.number().int(),
  subtotal_cents: z.number().int(),
});
export type OrderItemRow = z.infer<typeof orderItemRowSchema>;

export const ORDER_COLUMNS =
  "id, user_id, status, subtotal_cents, total_cents, currency, customer_name, customer_email, customer_phone, shipping_line1, shipping_line2, shipping_city, shipping_region, shipping_postal_code, shipping_country, email_status, email_error, email_sent_at, created_at, updated_at";

export const ORDER_ITEM_COLUMNS = "id, order_id, product_id, product_name, unit_price_cents, quantity, subtotal_cents";

export function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    subtotalCents: row.subtotal_cents,
  };
}

export function mapOrderRow(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    totalCents: row.total_cents,
    currency: row.currency.trim(),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddress: {
      line1: row.shipping_line1,
      line2: row.shipping_line2,
      city: row.shipping_city,
      region: row.shipping_region,
      postalCode: row.shipping_postal_code,
      country: row.shipping_country,
    },
    emailStatus: row.email_status,
    emailError: row.email_error,
    emailSentAt: row.email_sent_at,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
