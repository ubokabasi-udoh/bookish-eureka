import { describe, expect, it } from "vitest";
import type { Order } from "@/domain/entities";
import { EmailDeliveryError } from "@/domain/errors";
import type { StoreInfo } from "@/domain/ports";
import { MockEmailService } from "@/integrations/email/mock";

const store: StoreInfo = { name: "Northline", supportEmail: "support@example.com", url: "https://shop.example.com" };

const order: Order = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  status: "confirmed",
  subtotalCents: 12900,
  totalCents: 12900,
  currency: "USD",
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  customerPhone: null,
  shippingAddress: { line1: "1 Analytical St", line2: null, city: "London", region: "LDN", postalCode: "N1", country: "GB" },
  emailStatus: "pending",
  emailError: null,
  emailSentAt: null,
  items: [{ id: "i1", orderId: "o1", productId: "p1", productName: "Sweater", unitPriceCents: 12900, quantity: 1, subtotalCents: 12900 }],
  createdAt: "2026-01-02T10:30:00.000Z",
  updatedAt: "2026-01-02T10:30:00.000Z",
};

describe("MockEmailService", () => {
  it("records the rendered message instead of sending it", async () => {
    const service = new MockEmailService();
    await service.sendOrderConfirmation({ order, store });
    expect(service.sent).toHaveLength(1);
    expect(service.sent[0]).toMatchObject({ to: "ada@example.com", orderId: order.id });
    expect(service.sent[0].subject).toContain("Northline order confirmed");
    expect(service.sent[0].html).toContain("Sweater");
    expect(service.sent[0].text).toContain("Total: $129.00 USD");
  });

  it("fails exactly as many times as requested, then succeeds", async () => {
    const service = new MockEmailService();
    service.failNext(2);
    await expect(service.sendOrderConfirmation({ order, store })).rejects.toBeInstanceOf(EmailDeliveryError);
    await expect(service.sendOrderConfirmation({ order, store })).rejects.toBeInstanceOf(EmailDeliveryError);
    await expect(service.sendOrderConfirmation({ order, store })).resolves.toBeUndefined();
    expect(service.sent).toHaveLength(1);
  });

  it("can be configured to always fail", async () => {
    const service = new MockEmailService({ alwaysFail: true });
    await expect(service.sendOrderConfirmation({ order, store })).rejects.toBeInstanceOf(EmailDeliveryError);
    await expect(service.sendOrderConfirmation({ order, store })).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(service.sent).toHaveLength(0);
  });
});