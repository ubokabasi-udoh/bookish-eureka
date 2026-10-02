import type { Cents } from "./money";

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  slug: string;
  description: string;
  priceCents: Cents;
  currency: string;
  imageUrl: string;
  category: string;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Identity as reported by the authentication provider. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export type OrderStatus = "confirmed" | "cancelled";
export type EmailStatus = "pending" | "sent" | "failed";

export interface ShippingAddress {
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  /** Null if the product was later deleted; the snapshot fields below preserve history. */
  productId: string | null;
  productName: string;
  unitPriceCents: Cents;
  quantity: number;
  subtotalCents: Cents;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  subtotalCents: Cents;
  totalCents: Cents;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: ShippingAddress;
  emailStatus: EmailStatus;
  emailError: string | null;
  emailSentAt: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** What the browser is allowed to say about a cart line. Prices are never included. */
export interface CartLineInput {
  productId: string;
  quantity: number;
}
