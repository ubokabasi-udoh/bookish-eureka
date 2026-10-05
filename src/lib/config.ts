/** Public base URL of the app (no trailing slash). Used for OAuth redirects and links in emails. */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");

  return raw || "";
}

/** Name and contact details only: safe to call anywhere, including at build time. */
export function getStoreBranding() {
  return {
    name: process.env.STORE_NAME?.trim() || "Northline",
    supportEmail:
      process.env.STORE_SUPPORT_EMAIL?.trim() || "support@example.com",
  };
}

/** Branding plus the public URL (requires NEXT_PUBLIC_APP_URL in production). Used for emails. */
export function getStoreInfo() {
  return { ...getStoreBranding(), url: getAppUrl() };
}
