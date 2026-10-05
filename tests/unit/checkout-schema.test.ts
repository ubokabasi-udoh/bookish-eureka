import { describe, expect, it } from "vitest";
import {
  checkoutSchema,
  fieldErrorsFrom,
  MAX_CART_LINES,
  placeOrderSchema,
} from "@/domain/schemas/checkout";

const validForm = {
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  customerPhone: "",
  addressLine1: "1 Analytical Street",
  addressLine2: "",
  city: "London",
  region: "Greater London",
  postalCode: "N1 1AA",
  country: "United Kingdom",
};

const line = { productId: "11111111-1111-4111-8111-111111111111", quantity: 2 };

describe("checkoutSchema", () => {
  it("accepts a complete address", () => {
    expect(checkoutSchema.safeParse(validForm).success).toBe(true);
  });

  it("normalizes whitespace and email casing", () => {
    const parsed = checkoutSchema.parse({
      ...validForm,
      customerName: "  Ada Lovelace ",
      customerEmail: " ADA@Example.COM ",
    });
    expect(parsed.customerName).toBe("Ada Lovelace");
    expect(parsed.customerEmail).toBe("ada@example.com");
  });

  it("treats an empty optional field as absent", () => {
    const parsed = checkoutSchema.parse({
      ...validForm,
      customerPhone: "",
      addressLine2: "",
    });
    expect(parsed.customerPhone).toBe("");
    expect(parsed.addressLine2).toBe("");
  });

  it("rejects missing required fields with per-field messages", () => {
    const result = checkoutSchema.safeParse({});
    expect(result.success).toBe(false);
    const errors = fieldErrorsFrom(result.error!);
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining([
        "customerName",
        "customerEmail",
        "addressLine1",
        "city",
        "region",
        "postalCode",
        "country",
      ]),
    );
    expect(errors.customerName[0]).toBe("Full name is required.");
    expect(errors.customerEmail[0]).toBe("Email is required.");
  });

  it("rejects invalid emails and over-long values", () => {
    const badEmail = checkoutSchema.safeParse({
      ...validForm,
      customerEmail: "not-an-email",
    });
    expect(badEmail.success).toBe(false);
    expect(fieldErrorsFrom(badEmail.error!).customerEmail[0]).toBe(
      "Enter a valid email address.",
    );
    expect(
      checkoutSchema.safeParse({ ...validForm, customerName: "A" }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...validForm, country: "x".repeat(61) })
        .success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...validForm, customerPhone: "1".repeat(41) })
        .success,
    ).toBe(false);
  });
});

describe("placeOrderSchema", () => {
  it("accepts ids and quantities and ignores any client-supplied price", () => {
    const result = placeOrderSchema.safeParse({
      customer: validForm,
      items: [
        { ...line, priceCents: 1, subtotalCents: 1, name: "Free Sweater" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.items[0]).toEqual(line);
  });

  it("requires at least one line and a whole positive quantity", () => {
    expect(
      placeOrderSchema.safeParse({ customer: validForm, items: [] }).success,
    ).toBe(false);
    expect(
      placeOrderSchema.safeParse({
        customer: validForm,
        items: [{ ...line, quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      placeOrderSchema.safeParse({
        customer: validForm,
        items: [{ ...line, quantity: 1.5 }],
      }).success,
    ).toBe(false);
    expect(
      placeOrderSchema.safeParse({
        customer: validForm,
        items: [{ ...line, quantity: -3 }],
      }).success,
    ).toBe(false);
    expect(
      placeOrderSchema.safeParse({
        customer: validForm,
        items: [{ ...line, quantity: 500 }],
      }).success,
    ).toBe(false);
  });

  it("rejects non-uuid product ids so the database is never asked to cast them", () => {
    expect(
      placeOrderSchema.safeParse({
        customer: validForm,
        items: [{ productId: "1", quantity: 1 }],
      }).success,
    ).toBe(false);
  });

  it("bounds the number of lines", () => {
    const many = Array.from({ length: MAX_CART_LINES + 1 }, (_, i) => ({
      productId: `11111111-1111-4111-8111-${String(i + 1).padStart(12, "0")}`,
      quantity: 1,
    }));
    expect(
      placeOrderSchema.safeParse({ customer: validForm, items: many }).success,
    ).toBe(false);
    expect(
      placeOrderSchema.safeParse({
        customer: validForm,
        items: many.slice(0, MAX_CART_LINES),
      }).success,
    ).toBe(true);
  });
});

describe("fieldErrorsFrom", () => {
  it("groups messages per field and falls back to a form-level key", () => {
    const result = placeOrderSchema.safeParse({
      customer: validForm,
      items: [],
    });
    expect(result.success).toBe(false);
    const errors = fieldErrorsFrom(result.error!);
    expect(errors.items).toEqual(["Your cart is empty."]);
  });
});
