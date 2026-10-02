/** All monetary amounts are integer minor units (e.g. cents) to avoid floating-point drift. */
export type Cents = number;

export const DEFAULT_CURRENCY = "USD";

export function formatMoney(cents: Cents, currency: string = DEFAULT_CURRENCY, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function multiplyCents(unitCents: Cents, quantity: number): Cents {
  return unitCents * quantity;
}
