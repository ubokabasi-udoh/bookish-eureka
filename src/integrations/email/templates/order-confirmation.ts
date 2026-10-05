import type { Order } from "@/domain/entities";
import { formatMoney } from "@/domain/money";
import type { StoreInfo } from "@/domain/ports";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes every value that originates from a shopper before it goes into an HTML email. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

/**
 * Pure renderer for the order confirmation: no vendor, no I/O. Both bodies carry every field a
 * shopper needs to recognise the order, and everything shopper-supplied is escaped in the HTML.
 */
export function renderOrderConfirmation({ order, store }: { order: Order; store: StoreInfo }): RenderedEmail {
  const money = (cents: number) => formatMoney(cents, order.currency);
  const orderUrl = `${store.url}/orders/${order.id}`;
  const date = formatDate(order.createdAt);

  const addressLines = [
    order.customerName,
    order.shippingAddress.line1,
    order.shippingAddress.line2,
    `${order.shippingAddress.city}, ${order.shippingAddress.region} ${order.shippingAddress.postalCode}`,
    order.shippingAddress.country,
    order.customerPhone ? `Phone: ${order.customerPhone}` : null,
  ].filter((line): line is string => Boolean(line && line.trim()));

  const textLines = [
    `Thanks for your order, ${order.customerName}!`,
    "",
    `${store.name} order ${order.id}`,
    `Placed: ${date}`,
    order.customerEmail,
    "",
    "Items",
    ...order.items.map((item) => `  ${item.quantity} × ${item.productName} @ ${money(item.unitPriceCents)} = ${money(item.subtotalCents)}`),
    "",
    `Subtotal: ${money(order.subtotalCents)}`,
    `Total: ${money(order.totalCents)} ${order.currency}`,
    "",
    "Shipping to",
    ...addressLines.map((line) => `  ${line}`),
    "",
    `View your order: ${orderUrl}`,
    `Questions? Reply to this email or contact ${store.supportEmail}.`,
    "",
    `${store.name} — ${store.url}`,
  ];

  const itemRows = order.items
    .map(
      (item) => `        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e7e2da;">${escapeHtml(item.productName)}<br /><span style="color:#6b6560;font-size:13px;">${item.quantity} × ${escapeHtml(money(item.unitPriceCents))}</span></td>
          <td align="right" style="padding:8px 0;border-bottom:1px solid #e7e2da;white-space:nowrap;">${escapeHtml(money(item.subtotalCents))}</td>
        </tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(store.name)} order confirmation</title>
  </head>
  <body style="margin:0;background:#faf8f5;color:#1c1917;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <h1 style="font-size:22px;margin:0 0 4px;">Thanks for your order, ${escapeHtml(order.customerName)}!</h1>
      <p style="margin:0 0 24px;color:#6b6560;">We've received your order and it's being prepared.</p>

      <table role="presentation" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e7e2da;border-radius:12px;padding:8px;">
        <tr><td style="padding:16px 20px 0;" colspan="2">
          <p style="margin:0;font-size:13px;color:#6b6560;">Order reference</p>
          <p style="margin:2px 0 0;font-weight:600;word-break:break-all;">${escapeHtml(order.id)}</p>
          <p style="margin:12px 0 0;font-size:13px;color:#6b6560;">Placed</p>
          <p style="margin:2px 0 16px;">${escapeHtml(date)}</p>
        </td></tr>
${itemRows}
        <tr>
          <td style="padding:12px 0 4px;font-weight:600;">Subtotal</td>
          <td align="right" style="padding:12px 0 4px;">${escapeHtml(money(order.subtotalCents))}</td>
        </tr>
        <tr>
          <td style="padding:0 0 16px;font-weight:600;">Total (${escapeHtml(order.currency)})</td>
          <td align="right" style="padding:0 0 16px;font-weight:600;">${escapeHtml(money(order.totalCents))}</td>
        </tr>
      </table>

      <h2 style="font-size:15px;margin:28px 0 8px;">Shipping to</h2>
      <p style="margin:0;color:#6b6560;line-height:1.6;">
${addressLines.map((line) => `        ${escapeHtml(line)}`).join("<br />\n")}
      </p>

      <p style="margin:28px 0 0;">
        <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#1f4d3a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;">View your order</a>
      </p>
      <p style="margin:24px 0 0;color:#6b6560;font-size:13px;line-height:1.6;">
        Questions? Reply to this email or contact <a href="mailto:${escapeHtml(store.supportEmail)}" style="color:#1f4d3a;">${escapeHtml(store.supportEmail)}</a>.
      </p>
      <p style="margin:24px 0 0;color:#6b6560;font-size:13px;">${escapeHtml(store.name)} — <a href="${escapeHtml(store.url)}" style="color:#1f4d3a;">${escapeHtml(store.url)}</a></p>
    </div>
  </body>
</html>`;

  return {
    subject: `${store.name} order confirmed — ${order.id.slice(0, 8)}`,
    html,
    text: textLines.join("\n"),
  };
}