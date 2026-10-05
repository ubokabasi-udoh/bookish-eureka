export { MailgunEmailService } from "./mailgun";
export {
  getSharedMockEmailService,
  MockEmailService,
  resetSharedMockEmailService,
  type SentEmail,
} from "./mock";
export { escapeHtml, renderOrderConfirmation, type RenderedEmail } from "./templates/order-confirmation";