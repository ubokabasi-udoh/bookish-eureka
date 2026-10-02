import type { Order } from "../entities";

export interface StoreInfo {
  name: string;
  supportEmail: string;
  url: string;
}

export interface EmailService {
  /** Throws EmailDeliveryError on failure. Callers decide how to handle it. */
  sendOrderConfirmation(input: { order: Order; store: StoreInfo }): Promise<void>;
}
