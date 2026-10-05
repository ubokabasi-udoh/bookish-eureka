import { z } from "zod";
import { MAX_LINE_QUANTITY } from "../cart";

/** Upper bound on distinct lines in one order. Mirrors the guard in the place-order use case. */
export const MAX_CART_LINES = 50;

const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} is too long.`);

const optionalText = (max: number) => z.string().trim().max(max, "That value is too long.").optional();

/**
 * Shared by the checkout form (React Hook Form) and the server action, so the browser and the
 * server always agree. Every field is normalized (trimmed, email lower-cased) before use.
 */
export const checkoutSchema = z.object({
  customerName: text("Full name", 2, 120),
  customerEmail: z
    .string({ error: "Email is required." })
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(254, "That email address is too long.")),
  customerPhone: optionalText(40),
  addressLine1: text("Address", 3, 120),
  addressLine2: optionalText(120),
  city: text("City", 2, 80),
  region: text("State / region", 2, 80),
  postalCode: text("Postal code", 2, 20),
  country: text("Country", 2, 60),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/** What the browser may send about a cart line: an id and a quantity. Never a price. */
export const cartLineSchema = z.object({
  productId: z.uuid("That product reference is invalid."),
  quantity: z.number().int("Quantity must be a whole number.").positive("Quantity must be at least 1.").max(MAX_LINE_QUANTITY),
});

/** The full payload accepted by the place-order server action. */
export const placeOrderSchema = z.object({
  customer: checkoutSchema,
  items: z.array(cartLineSchema).min(1, "Your cart is empty.").max(MAX_CART_LINES, "Your cart has too many items."),
});

export type PlaceOrderPayload = z.infer<typeof placeOrderSchema>;

/** Flattens Zod issues into `{ field: [messages] }` for form rendering. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}