import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EmailStatus, Order } from "@/domain/entities";
import {
  CurrencyMismatchError,
  DomainError,
  EmptyCartError,
  InsufficientStockError,
  ProductUnavailableError,
  RepositoryError,
  ValidationError,
} from "@/domain/errors";
import type { CreateOrderInput, OrderRepository } from "@/domain/ports";
import {
  mapOrderItemRow,
  mapOrderRow,
  ORDER_COLUMNS,
  ORDER_ITEM_COLUMNS,
  orderItemRowSchema,
  orderRowSchema,
} from "../mappers";

const itemsSchema = z.array(orderItemRowSchema);

/**
 * Translates the `CODE:detail` messages raised by the place_order SQL function into domain errors,
 * so callers never have to parse Postgres text.
 */
export function errorFromPlaceOrder(message: string, cause: unknown): DomainError {
  const [code, ...detail] = message.split(":");
  switch (code.trim()) {
    case "EMPTY_CART":
      return new EmptyCartError();
    case "INVALID_QUANTITY":
      return new ValidationError("One of the cart quantities was invalid.", { items: ["Quantity must be at least 1."] });
    case "PRODUCT_UNAVAILABLE":
      return new ProductUnavailableError(detail[0] ?? "");
    case "INSUFFICIENT_STOCK":
      return new InsufficientStockError(detail[0] ?? "", Number.parseInt(detail[1] ?? "0", 10));
    case "CURRENCY_MISMATCH":
      return new CurrencyMismatchError();
    default:
      return new RepositoryError("Could not place the order.", cause);
  }
}

/**
 * Order writes go through the service-role client. Creation is delegated to the `place_order`
 * Postgres function, which prices from the database and locks rows; this class never computes money.
 */
export class SupabaseOrderRepository implements OrderRepository {
  constructor(private readonly serviceClient: SupabaseClient) {}

  private async load(orderId: string, userId: string): Promise<Order | null> {
    const { data: order, error } = await this.serviceClient
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new RepositoryError("Could not load the order.", new Error(error.message));
    if (!order) return null;

    const { data: items, error: itemsError } = await this.serviceClient
      .from("order_items")
      .select(ORDER_ITEM_COLUMNS)
      .eq("order_id", orderId)
      .order("product_name");
    if (itemsError) throw new RepositoryError("Could not load the order items.", new Error(itemsError.message));

    const parsedOrder = orderRowSchema.safeParse(order);
    const parsedItems = itemsSchema.safeParse(items);
    if (!parsedOrder.success || !parsedItems.success) throw new RepositoryError("Unexpected order data shape.");
    return mapOrderRow(parsedOrder.data, parsedItems.data.map(mapOrderItemRow));
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const { data: orderId, error } = await this.serviceClient.rpc("place_order", {
      p_user_id: input.userId,
      p_customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        line1: input.customer.address.line1,
        line2: input.customer.address.line2,
        city: input.customer.address.city,
        region: input.customer.address.region,
        postalCode: input.customer.address.postalCode,
        country: input.customer.address.country,
      },
      p_items: input.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });
    if (error) throw errorFromPlaceOrder(error.message, error);
    if (typeof orderId !== "string") throw new RepositoryError("The database did not return an order id.");

    const created = await this.load(orderId, input.userId);
    if (!created) throw new RepositoryError("The order was created but could not be read back.");
    return created;
  }

  async getByIdForUser(orderId: string, userId: string): Promise<Order | null> {
    return this.load(orderId, userId);
  }

  async updateEmailStatus(orderId: string, status: EmailStatus, emailError: string | null = null): Promise<void> {
    const { error } = await this.serviceClient
      .from("orders")
      .update({
        email_status: status,
        email_error: status === "failed" ? emailError : null,
        email_sent_at: status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", orderId);
    if (error) throw new RepositoryError("Could not record the email status.", new Error(error.message));
  }
}