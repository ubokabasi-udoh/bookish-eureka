import { describe, expect, it } from "vitest";
import type { Order } from "@/domain/entities";
import { escapeHtml, renderOrderConfirmation } from "@/integrations/email/templates/order-confirmation";

const store = { name: "Northline", supportEmail: "support@example.com", url: "https://shop.example.com" };

const order: Order = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  status: "confirmed",
  subtotalCents: 28600,
  totalCents: 28600,
  currency: "USD",
  customerName: 'Ada "The Countess" <Lovelace>',
  customerEmail: "ada@example.com",
  customerPhone: "+1 555 0100",
  shippingAddress: {
    line1: "1 Analytical Street",
    line2: null,
    city: "London",
    region: "Greater London",
    postalCode: "N1 1AA",
    country: "United Kingdom",
  },
  emailStatus: "pending",
  emailError: null,
  emailSentAt: null,
  items: [
    { id: "i1", orderId: "o1", productId: "p1", productName: "Merino Sweater", unitPriceCents: 12900, quantity: 2, subtotalCents: 25800 },
    { id: "i2", orderId: "o1", productId: "p2", productName: "Soy <b>Candle</b>", unitPriceCents: 2800, quantity: 1, subtotalCents: 2800 },
  ],
  createdAt: "2026-01-02T10:30:00.000Z",
  updatedAt: "2026-01-02T10:30:00.000Z",
};

describe("escapeHtml", () => {
  it("neutralizes every HTML-significant character", () => {
    expect(escapeHtml(`<script>alert("x")&'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;",
    );
  });
});

describe("renderOrderConfirmation", () => {
  const email = renderOrderConfirmation({ order, store });

  it("puts a recognizable reference in the subject", () => {
    expect(email.subject).toBe("Northline order confirmed — 11111111");
  });

  it("includes every order field in the plain-text body", () => {
    for (const expected of [
      "Ada \"The Countess\" <Lovelace>",
      order.id,
      "ada@example.com",
      "Merino Sweater",
      "2 × Merino Sweater @ $129.00 = $258.00",
      "Soy <b>Candle</b>",
      "Subtotal: $286.00",
      "Total: $286.00 USD",
      "1 Analytical Street",
      "London, Greater London N1 1AA",
      "United Kingdom",
      "+1 555 0100",
      "https://shop.example.com/orders/11111111-1111-4111-8111-111111111111",
      "support@example.com",
    ]) {
      expect(email.text).toContain(expected);
    }
  });

  it("escapes shopper-supplied values in the HTML body", () => {
    expect(email.html).toContain("Ada &quot;The Countess&quot; &lt;Lovelace&gt;");
    expect(email.html).toContain("Soy &lt;b&gt;Candle&lt;/b&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<b>Candle</b>");
  });

  it("includes the money, address and order link in the HTML body", () => {
    expect(email.html).toContain("$286.00");
    expect(email.html).toContain("1 Analytical Street");
    expect(email.html).toContain("href=\"https://shop.example.com/orders/11111111-1111-4111-8111-111111111111\"");
  });
});