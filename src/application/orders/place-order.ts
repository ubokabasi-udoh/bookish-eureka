import { z } from "zod";
import type { Order, ShippingAddress } from "@/domain/entities";
import {
  AuthRequiredError,
  EmptyCartError,
  InsufficientStockError,
  ProductUnavailableError,
  ValidationError,
} from "@/domain/errors";
import type { StoreInfo } from "@/domain/ports";
import { fieldErrorsFrom, placeOrderSchema } from "@/domain/schemas/checkout";
import { logger } from "@/lib/logger";
import type { Services } from "../services";

const orderIdSchema = z.uuid();

const blankToNull = (value: string | undefined): string | null => (value && value.trim() ? value.trim() : null);

function toShippingAddress(customer: z.infer<typeof placeOrderSchema>["customer"]): ShippingAddress {
  return {
    line1: customer.addressLine1,
    line2: blankToNull(customer.addressLine2),
    city: customer.city,
    region: customer.region,
    postalCode: customer.postalCode,
    country: customer.country,
  };
}

/**
 * Best-effort confirmation email. Runs only after the order is committed, and never throws:
 * a failed email is recorded on the order and logged, but the shopper still gets their order.
 */
async function sendConfirmation(
  services: Pick<Services, "orders" | "email">,
  order: Order,
  store: StoreInfo,
): Promise<Order> {
  try {
    await services.email.sendOrderConfirmation({ order, store });
    await services.orders.updateEmailStatus(order.id, "sent");
    return { ...order, emailStatus: "sent", emailError: null, emailSentAt: new Date().toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("email.order_confirmation_failed", { orderId: order.id, error });
    try {
      await services.orders.updateEmailStatus(order.id, "failed", message);
    } catch (statusError) {
      logger.error("email.status_update_failed", { orderId: order.id, error: statusError });
    }
    return { ...order, emailStatus: "failed", emailError: message, emailSentAt: null };
  }
}

export interface PlaceOrderInput {
  /** Verified server-side identity. Never taken from the payload. */
  userId: string;
  /** Untrusted browser payload: validated here, never trusted for prices, stock or identity. */
  payload: unknown;
  store: StoreInfo;
}

/**
 * Server-authoritative checkout:
 *   validate user → validate payload (Zod) → re-read products → check active/stock →
 *   atomic create (prices computed in the database) → confirmation email.
 * Client-supplied prices and totals are ignored because nothing but ids and quantities is accepted.
 */
export async function placeOrder(
  services: Pick<Services, "orders" | "products" | "email">,
  input: PlaceOrderInput,
): Promise<Order> {
  if (!input.userId) throw new AuthRequiredError();

  const rawItems = (input.payload as { items?: unknown } | null)?.items;
  if (Array.isArray(rawItems) && rawItems.length === 0) throw new EmptyCartError();

  const parsed = placeOrderSchema.safeParse(input.payload);
  if (!parsed.success) {
    throw new ValidationError("Please check your details and try again.", fieldErrorsFrom(parsed.error));
  }
  const { customer, items } = parsed.data;

  // Pre-flight read for friendly, product-named errors. The repository still re-validates atomically,
  // so this cannot be used to oversell: it only improves the message when stock has already changed.
  const products = await services.products.getByIds(items.map((line) => line.productId));
  const byId = new Map(products.map((product) => [product.id, product]));
  for (const line of items) {
    const product = byId.get(line.productId);
    if (!product || !product.isActive) throw new ProductUnavailableError(line.productId, product?.name);
    if (product.stockQuantity < line.quantity) {
      throw new InsufficientStockError(line.productId, product.stockQuantity, product.name);
    }
  }

  const order = await services.orders.create({
    userId: input.userId,
    customer: {
      name: customer.customerName,
      email: customer.customerEmail,
      phone: blankToNull(customer.customerPhone),
      address: toShippingAddress(customer),
    },
    items: items.map((line) => ({ productId: line.productId, quantity: line.quantity })),
  });

  return sendConfirmation(services, order, input.store);
}

/** Loads an order only when it belongs to the given user; invalid ids resolve to null (404). */
export async function getOrderForUser(
  services: Pick<Services, "orders">,
  orderId: string,
  userId: string,
): Promise<Order | null> {
  if (!orderIdSchema.safeParse(orderId).success) return null;
  return services.orders.getByIdForUser(orderId, userId);
}