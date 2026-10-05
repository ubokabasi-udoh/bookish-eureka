"use server";

import { requireUser } from "@/application/auth/complete-sign-in";
import { placeOrder } from "@/application/orders/place-order";
import { DomainError, ValidationError } from "@/domain/errors";
import { getServices } from "@/integrations/container";
import { getStoreInfo } from "@/lib/config";
import { logger } from "@/lib/logger";

export type CheckoutActionResult =
  | { ok: true; orderId: string }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Server action for checkout. Identity comes from the verified session, never from the payload;
 * prices, stock and totals are recomputed server-side by the place-order use case.
 */
export async function placeOrderAction(payload: unknown): Promise<CheckoutActionResult> {
  const services = getServices();
  try {
    const user = await requireUser(services);
    const order = await placeOrder(services, { userId: user.id, payload, store: getStoreInfo() });
    logger.info("checkout.order_placed", { orderId: order.id, emailStatus: order.emailStatus });
    return { ok: true, orderId: order.id };
  } catch (error) {
    if (error instanceof DomainError) {
      const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
      return { ok: false, code: error.code, message: error.message, fieldErrors };
    }
    logger.error("checkout.place_order_failed", { error });
    return { ok: false, code: "REPOSITORY", message: "We couldn't place your order. Please try again." };
  }
}