import type { Order } from "@/domain/entities";
import { EmailDeliveryError } from "@/domain/errors";
import type { EmailService, StoreInfo } from "@/domain/ports";
import { renderOrderConfirmation } from "./templates/order-confirmation";

export interface SentEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  orderId: string;
  sentAt: string;
}

/**
 * In-process email adapter for tests and the memory driver. It renders the real template (so tests
 * can assert on the body) and records every message instead of sending it.
 *
 * Failure can be simulated by calling `failNext()` (one-shot) or by constructing with `{ alwaysFail: true }`.
 */
export class MockEmailService implements EmailService {
  readonly sent: SentEmail[] = [];
  private failuresRemaining = 0;

  constructor(private readonly options: { alwaysFail?: boolean } = {}) {}

  /** Makes the next `count` sends throw, exercising the "order succeeds, email fails" path. */
  failNext(count = 1): void {
    this.failuresRemaining += count;
  }

  async sendOrderConfirmation({ order, store }: { order: Order; store: StoreInfo }): Promise<void> {
    const { subject, html, text } = renderOrderConfirmation({ order, store });
    if (this.options.alwaysFail || this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new EmailDeliveryError("Simulated email delivery failure.");
    }
    this.sent.push({ to: order.customerEmail, subject, html, text, orderId: order.id, sentAt: new Date().toISOString() });
  }
}

const GLOBAL_KEY = Symbol.for("shop.mockEmailService");

/** One recorder per server process so the memory driver can be inspected across requests. */
export function getSharedMockEmailService(): MockEmailService {
  const g = globalThis as unknown as Record<symbol, MockEmailService | undefined>;
  return (g[GLOBAL_KEY] ??= new MockEmailService());
}

export function resetSharedMockEmailService(): void {
  (globalThis as unknown as Record<symbol, MockEmailService | undefined>)[GLOBAL_KEY] = new MockEmailService();
}