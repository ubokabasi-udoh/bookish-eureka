import { describe, expect, it } from "vitest";
import type { ShippingAddress } from "@/domain/entities";
import { CurrencyMismatchError, EmptyCartError } from "@/domain/errors";
import { MemoryOrderRepository } from "@/integrations/database/memory/order-repository";
import { MemoryProductRepository } from "@/integrations/database/memory/product-repository";
import { createMemoryStore, type MemoryStore } from "@/integrations/database/memory/store";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const address: ShippingAddress = {
  line1: "1 Analytical Street",
  line2: null,
  city: "London",
  region: "Greater London",
  postalCode: "N1 1AA",
  country: "United Kingdom",
};

function setup() {
  const store: MemoryStore = createMemoryStore();
  return {
    store,
    products: new MemoryProductRepository(store),
    orders: new MemoryOrderRepository(store),
  };
}

const input = (userId: string, items: { productId: string; quantity: number }[]) => ({
  userId,
  customer: { name: "Ada", email: "ada@example.com", phone: null, address },
  items,
});

describe("MemoryOrderRepository", () => {
  it("refuses an empty order", async () => {
    const { orders } = setup();
    await expect(orders.create(input(USER, []))).rejects.toBeInstanceOf(EmptyCartError);
  });

  it("rejects an order that mixes currencies", async () => {
    const { store, products, orders } = setup();
    const sweater = (await products.getBySlug("merino-crew-sweater"))!;
    const candle = (await products.getBySlug("soy-wax-candle"))!;
    store.products.set(candle.id, { ...candle, currency: "EUR" });

    await expect(
      orders.create(input(USER, [{ productId: sweater.id, quantity: 1 }, { productId: candle.id, quantity: 1 }])),
    ).rejects.toBeInstanceOf(CurrencyMismatchError);
    expect(store.orders.size).toBe(0);
  });

  it("records the email outcome and ignores unknown order ids", async () => {
    const { products, orders } = setup();
    const sweater = (await products.getBySlug("merino-crew-sweater"))!;
    const order = await orders.create(input(USER, [{ productId: sweater.id, quantity: 1 }]));
    expect(order.emailStatus).toBe("pending");

    await orders.updateEmailStatus(order.id, "sent");
    expect(await orders.getByIdForUser(order.id, USER)).toMatchObject({ emailStatus: "sent", emailError: null });
    expect((await orders.getByIdForUser(order.id, USER))?.emailSentAt).not.toBeNull();

    await orders.updateEmailStatus(order.id, "failed", "provider down");
    expect(await orders.getByIdForUser(order.id, USER)).toMatchObject({ emailStatus: "failed", emailError: "provider down" });

    // Unknown id: a no-op rather than a crash.
    await expect(orders.updateEmailStatus("33333333-3333-4333-8333-333333333333", "sent")).resolves.toBeUndefined();
  });

  it("scopes reads to the owning user", async () => {
    const { products, orders } = setup();
    const sweater = (await products.getBySlug("merino-crew-sweater"))!;
    const order = await orders.create(input(USER, [{ productId: sweater.id, quantity: 1 }]));
    expect((await orders.getByIdForUser(order.id, USER))?.id).toBe(order.id);
    expect(await orders.getByIdForUser(order.id, OTHER)).toBeNull();
  });
});