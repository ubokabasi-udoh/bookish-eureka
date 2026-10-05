import "server-only";
import type { Order } from "@/domain/entities";
import { EmailDeliveryError } from "@/domain/errors";
import type { EmailService, StoreInfo } from "@/domain/ports";
import { logger } from "@/lib/logger";
import { getMailgunConfig } from "../config";
import { renderOrderConfirmation } from "./templates/order-confirmation";

const TIMEOUT_MS = 10_000;

/**
 * Sends transactional email through Mailgun's REST API. No SDK: a plain fetch keeps the adapter
 * small and easy to swap for Resend/Postmark. Errors are translated to EmailDeliveryError so the
 * application layer can record a failure without failing the order.
 */
export class MailgunEmailService implements EmailService {
  async sendOrderConfirmation({ order, store }: { order: Order; store: StoreInfo }): Promise<void> {
    const config = getMailgunConfig();
    const { subject, html, text } = renderOrderConfirmation({ order, store });

    const body = new URLSearchParams();
    body.set("from", config.fromEmail);
    body.set("to", order.customerEmail);
    body.set("subject", subject);
    body.set("text", text);
    body.set("html", html);
    // Route replies to the store inbox rather than the (unmonitored) sending address.
    body.set("h:Reply-To", store.supportEmail);
    body.set("o:tag", "order-confirmation");

    const endpoint = `${config.baseUrl}/v3/${encodeURIComponent(config.domain)}/messages`;
    const authorization = `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      logger.error("email.mailgun_network_error", { orderId: order.id, error });
      throw new EmailDeliveryError("Could not reach the email provider.", error);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logger.error("email.mailgun_rejected", { orderId: order.id, status: response.status, detail: detail.slice(0, 500) });
      throw new EmailDeliveryError(`Email provider rejected the message (HTTP ${response.status}).`, new Error(detail.slice(0, 500)));
    }
  }
}