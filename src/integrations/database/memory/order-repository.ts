import { randomUUID } from "node:crypto";
import { normalizeCartLines, type CartLineInput } from "@/domain/cart";
import type { EmailStatus, Order, OrderItem } from "@/domain/entities";
import {
  CurrencyMismatchError,
  EmptyCartError,
  InsufficientStockError,
  ProductUnavailableError,
} from "@/domain/errors";
import type { CreateOrderInput, OrderRepository } from "@/domain/ports";
import type { MemoryStore } from "./store";

/**
 * In-memory order repository for the memory driver and tests. It mirrors the guarantees of the
 * `place_order` SQL function: prices come from the store (never the caller), stock is validated
 * before anything is written, and the whole operation is completed before returning.
 *
 * Node runs JavaScript on a single thread, so the read-validate-write block below cannot interleave
 * with another order — the same "no overselling" property the row locks give us in Postgres.
 */
export class MemoryOrderRepository implements OrderRepository {
  constructor(private readonly store: MemoryStore) {}

  async create(input: CreateOrderInput): Promise<Order> {
    const lines: CartLineInput[] = normalizeCartLines(input.items);
    if (lines.length === 0) throw new EmptyCartError();

    let currency: string | null = null;
    let subtotalCents = 0;
    const priced: { productId: string; name: string; unit: number; quantity: number }[] = [];

    for (const line of lines) {
      const product = this.store.products.get(line.productId);
      if (!product || !product.isActive) throw new ProductUnavailableError(line.productId, product?.name);
      if (product.stockQuantity < line.quantity) {
        throw new InsufficientStockError(line.productId, product.stockQuantity, product.name);
      }
      if (currency === null) currency = product.currency;
      else if (currency !== product.currency) throw new CurrencyMismatchError();

      subtotalCents += product.priceCents * line.quantity;
      priced.push({ productId: product.id, name: product.name, unit: product.priceCents, quantity: line.quantity });
    }

    const orderId = randomUUID();
    const now = new Date().toISOString();

    const items: OrderItem[] = priced.map((line) => ({
      id: randomUUID(),
      orderId,
      productId: line.productId,
      productName: line.name,
      unitPriceCents: line.unit,
      quantity: line.quantity,
      subtotalCents: line.unit * line.quantity,
    }));

    // Commit: decrement stock and store the order together.
    for (const line of priced) {
      const product = this.store.products.get(line.productId)!;
      this.store.products.set(line.productId, { ...product, stockQuantity: product.stockQuantity - line.quantity, updatedAt: now });
    }

    const order: Order = {
      id: orderId,
      userId: input.userId,
      status: "confirmed",
      subtotalCents,
      totalCents: subtotalCents,
      currency: currency!,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone,
      shippingAddress: input.customer.address,
      emailStatus: "pending",
      emailError: null,
      emailSentAt: null,
      items,
      createdAt: now,
      updatedAt: now,
    };
    this.store.orders.set(orderId, order);
    return order;
  }

  async getByIdForUser(orderId: string, userId: string): Promise<Order | null> {
    const order = this.store.orders.get(orderId);
    return order && order.userId === userId ? order : null;
  }

  async updateEmailStatus(orderId: string, status: EmailStatus, emailError: string | null = null): Promise<void> {
    const order = this.store.orders.get(orderId);
    if (!order) return;
    this.store.orders.set(orderId, {
      ...order,
      emailStatus: status,
      emailError: status === "failed" ? emailError : null,
      emailSentAt: status === "sent" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
  }
}