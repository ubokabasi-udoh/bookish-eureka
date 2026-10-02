import type { CartLineInput, EmailStatus, Order, ShippingAddress } from "../entities";

export interface CreateOrderInput {
  userId: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    address: ShippingAddress;
  };
  /** Only ids and quantities: the repository prices the order from the database. */
  items: CartLineInput[];
}

export interface OrderRepository {
  /**
   * Atomically creates the order and its items and decrements stock.
   * Throws ProductUnavailableError, InsufficientStockError, or RepositoryError.
   */
  create(input: CreateOrderInput): Promise<Order>;
  getByIdForUser(orderId: string, userId: string): Promise<Order | null>;
  updateEmailStatus(orderId: string, status: EmailStatus, error?: string | null): Promise<void>;
}
