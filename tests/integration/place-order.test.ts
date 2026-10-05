import { beforeEach, describe, expect, it } from "vitest";
import { getOrderForUser, placeOrder } from "@/application/orders/place-order";
import type { Product } from "@/domain/entities";
import {
  AuthRequiredError,
  EmptyCartError,
  InsufficientStockError,
  ProductUnavailableError,
  ValidationError,
} from "@/domain/errors";
import type { StoreInfo } from "@/domain/ports";
import { MemoryOrderRepository } from "@/integrations/database/memory/order-repository";
import { MemoryProductRepository } from "@/integrations/database/memory/product-repository";
import { createMemoryStore, type MemoryStore } from "@/integrations/database/memory/store";
import { MockEmailService } from "@/integrations/email/mock";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "22222222-2222-4222-8222-222222222222";
const store: StoreInfo = { name: "Northline", supportEmail: "support@example.com", url: "https://shop.example.com" };

const customer = {
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  customerPhone: "+1 555 0100",
  addressLine1: "1 Analytical Street",
  addressLine2: "",
  city: "London",
  region: "Greater London",
  postalCode: "N1 1AA",
  country: "United Kingdom",
};

let memory: MemoryStore;
let products: MemoryProductRepository;
let orders: MemoryOrderRepository;
let email: MockEmailService;
let services: { products: MemoryProductRepository; orders: MemoryOrderRepository; email: MockEmailService };

beforeEach(() => {
  memory = createMemoryStore();
  products = new MemoryProductRepository(memory);
  orders = new MemoryOrderRepository(memory);
  email = new MockEmailService();
  services = { products, orders, email };
});

async function bySlug(slug: string): Promise<Product> {
  const product = await products.getBySlug(slug);
  if (!product) throw new Error(`missing seed product: ${slug}`);
  return product;
}

async function stock(slug: string): Promise<number> {
  return (await bySlug(slug)).stockQuantity;
}

function payload(items: unknown): unknown {
  return { customer, items };
}

describe("placeOrder: happy path", () => {
  it("prices from the catalog, decrements stock, sends the email and reports it as sent", async () => {
    const sweater = await bySlug("merino-crew-sweater"); // 12900, stock 24
    const candle = await bySlug("soy-wax-candle"); // 2800, stock 120

    const order = await placeOrder(services, {
      userId: USER,
      payload: payload([
        { productId: sweater.id, quantity: 2 },
        { productId: candle.id, quantity: 1 },
      ]),
      store,
    });

    expect(order.subtotalCents).toBe(12900 * 2 + 2800);
    expect(order.totalCents).toBe(order.subtotalCents);
    expect(order.currency).toBe("USD");
    expect(order.status).toBe("confirmed");
    expect(order.userId).toBe(USER);
    expect(order.customerName).toBe("Ada Lovelace");
    expect(order.shippingAddress).toMatchObject({ city: "London", postalCode: "N1 1AA", line2: null });

    // Items snapshot the name and unit price.
    expect(order.items.map((item) => item.productName).sort()).toEqual(["Merino Crew Sweater", "Soy Wax Candle"]);
    expect(order.items.find((item) => item.productId === sweater.id)).toMatchObject({
      unitPriceCents: 12900,
      quantity: 2,
      subtotalCents: 25800,
    });

    // Stock decremented exactly once, email sent and recorded.
    expect(await stock("merino-crew-sweater")).toBe(22);
    expect(await stock("soy-wax-candle")).toBe(119);
    expect(order.emailStatus).toBe("sent");
    expect(order.emailError).toBeNull();
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe("ada@example.com");
    expect(email.sent[0].orderId).toBe(order.id);
    expect(await orders.getByIdForUser(order.id, USER)).toMatchObject({ emailStatus: "sent" });
  });

  it("ignores any price, total or name the browser tries to send", async () => {
    const sweater = await bySlug("merino-crew-sweater");
    const order = await placeOrder(services, {
      userId: USER,
      payload: payload([
        { productId: sweater.id, quantity: 1, priceCents: 1, subtotalCents: 1, productName: "Free Sweater", totalCents: 1 },
      ]),
      store,
    });
    expect(order.subtotalCents).toBe(12900);
    expect(order.items[0].unitPriceCents).toBe(12900);
    expect(order.items[0].productName).toBe("Merino Crew Sweater");
  });

  it("merges duplicate lines into one and charges each unit once", async () => {
    const sweater = await bySlug("merino-crew-sweater");
    const order = await placeOrder(services, {
      userId: USER,
      payload: payload([
        { productId: sweater.id, quantity: 1 },
        { productId: sweater.id, quantity: 2 },
      ]),
      store,
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(3);
    expect(order.subtotalCents).toBe(12900 * 3);
  });
});

describe("placeOrder: failure paths", () => {
  it("rejects unauthenticated callers before touching the catalog", async () => {
    const sweater = await bySlug("merino-crew-sweater");
    await expect(
      placeOrder(services, { userId: "", payload: payload([{ productId: sweater.id, quantity: 1 }]), store }),
    ).rejects.toBeInstanceOf(AuthRequiredError);
    expect(email.sent).toHaveLength(0);
  });

  it("rejects an empty cart", async () => {
    await expect(placeOrder(services, { userId: USER, payload: payload([]), store })).rejects.toBeInstanceOf(EmptyCartError);
  });

  it("rejects out-of-stock products", async () => {
    const organizer = await bySlug("walnut-desk-organizer"); // stock 0
    await expect(
      placeOrder(services, { userId: USER, payload: payload([{ productId: organizer.id, quantity: 1 }]), store }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
    expect(memory.orders.size).toBe(0);
  });

  it("rejects a quantity larger than the stock on hand", async () => {
    const blanket = await bySlug("wool-throw-blanket"); // stock 3
    const error = await placeOrder(services, {
      userId: USER,
      payload: payload([{ productId: blanket.id, quantity: 4 }]),
      store,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(InsufficientStockError);
    expect((error as InsufficientStockError).available).toBe(3);
    expect(await stock("wool-throw-blanket")).toBe(3);
  });

  it("rejects inactive products", async () => {
    const candle = await bySlug("soy-wax-candle");
    memory.products.set(candle.id, { ...candle, isActive: false });
    await expect(
      placeOrder(services, { userId: USER, payload: payload([{ productId: candle.id, quantity: 1 }]), store }),
    ).rejects.toBeInstanceOf(ProductUnavailableError);
  });

  it("rejects products that no longer exist", async () => {
    await expect(
      placeOrder(services, {
        userId: USER,
        payload: payload([{ productId: "33333333-3333-4333-8333-333333333333", quantity: 1 }]),
        store,
      }),
    ).rejects.toBeInstanceOf(ProductUnavailableError);
  });

  it("validates the payload and reports field errors", async () => {
    const sweater = await bySlug("merino-crew-sweater");
    const error = await placeOrder(services, {
      userId: USER,
      payload: { customer: { ...customer, customerEmail: "nope" }, items: [{ productId: sweater.id, quantity: 1 }] },
      store,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors["customer.customerEmail"]).toEqual(["Enter a valid email address."]);
  });

  it("rejects non-uuid product ids", async () => {
    await expect(
      placeOrder(services, { userId: USER, payload: payload([{ productId: "1", quantity: 1 }]), store }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("placeOrder: inventory safety", () => {
  it("never oversells when two orders race for the last units", async () => {
    const blanket = await bySlug("wool-throw-blanket"); // stock 3
    const attempt = () =>
      placeOrder(services, { userId: USER, payload: payload([{ productId: blanket.id, quantity: 2 }]), store });

    const results = await Promise.allSettled([attempt(), attempt()]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);
    expect(await stock("wool-throw-blanket")).toBe(1);
    expect(memory.orders.size).toBe(1);
  });

  it("keeps the item snapshot even if the catalog later changes", async () => {
    const candle = await bySlug("soy-wax-candle");
    const order = await placeOrder(services, {
      userId: USER,
      payload: payload([{ productId: candle.id, quantity: 1 }]),
      store,
    });
    memory.products.set(candle.id, { ...candle, name: "Renamed", priceCents: 99999 });
    const reloaded = await orders.getByIdForUser(order.id, USER);
    expect(reloaded?.items[0]).toMatchObject({ productName: "Soy Wax Candle", unitPriceCents: 2800 });
  });
});

describe("placeOrder: email is best-effort", () => {
  it("still places the order when the provider rejects the email, and records the failure", async () => {
    const sweater = await bySlug("merino-crew-sweater");
    email.failNext();

    const order = await placeOrder(services, {
      userId: USER,
      payload: payload([{ productId: sweater.id, quantity: 1 }]),
      store,
    });

    expect(order.emailStatus).toBe("failed");
    expect(order.emailError).toContain("Simulated email delivery failure");
    expect(await stock("merino-crew-sweater")).toBe(23); // stock still committed
    expect(email.sent).toHaveLength(0);
    expect(await orders.getByIdForUser(order.id, USER)).toMatchObject({
      emailStatus: "failed",
      emailError: "Simulated email delivery failure.",
    });
  });

  it("recovers on a later order once the provider works again", async () => {
    const sweater = await bySlug("merino-crew-sweater");
    email.failNext();
    await placeOrder(services, { userId: USER, payload: payload([{ productId: sweater.id, quantity: 1 }]), store });
    const second = await placeOrder(services, {
      userId: USER,
      payload: payload([{ productId: sweater.id, quantity: 1 }]),
      store,
    });
    expect(second.emailStatus).toBe("sent");
    expect(email.sent).toHaveLength(1);
  });
});

describe("getOrderForUser", () => {
  it("returns only the signed-in user's order and treats invalid ids as missing", async () => {
    const sweater = await bySlug("merino-crew-sweater");
    const order = await placeOrder(services, {
      userId: USER,
      payload: payload([{ productId: sweater.id, quantity: 1 }]),
      store,
    });

    expect((await getOrderForUser(services, order.id, USER))?.id).toBe(order.id);
    expect(await getOrderForUser(services, order.id, OTHER_USER)).toBeNull();
    expect(await getOrderForUser(services, "not-a-uuid", USER)).toBeNull();
    expect(await getOrderForUser(services, "33333333-3333-4333-8333-333333333333", USER)).toBeNull();
  });
});