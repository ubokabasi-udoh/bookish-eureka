/** Errors the application layer understands. Adapters translate vendor errors into these. */
export type ErrorCode =
  | "VALIDATION"
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "EMPTY_CART"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "CURRENCY_MISMATCH"
  | "REPOSITORY"
  | "AUTH_PROVIDER"
  | "EMAIL_DELIVERY";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly fieldErrors: Record<string, string[]> = {}) {
    super("VALIDATION", message);
  }
}
export class AuthRequiredError extends DomainError {
  constructor() {
    super("AUTH_REQUIRED", "You need to sign in to continue.");
  }
}
export class NotFoundError extends DomainError {
  constructor(what: string) {
    super("NOT_FOUND", `${what} was not found.`);
  }
}
export class EmptyCartError extends DomainError {
  constructor() {
    super("EMPTY_CART", "Your cart is empty.");
  }
}
export class ProductUnavailableError extends DomainError {
  constructor(public readonly productId: string, public readonly productName?: string) {
    super("PRODUCT_UNAVAILABLE", `${productName ?? "A product in your cart"} is no longer available.`);
  }
}
export class InsufficientStockError extends DomainError {
  constructor(public readonly productId: string, public readonly available: number, public readonly productName?: string) {
    super("INSUFFICIENT_STOCK", `Only ${available} of ${productName ?? "this product"} left in stock.`);
  }
}
export class RepositoryError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super("REPOSITORY", message, { cause });
  }
}
export class AuthProviderError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super("AUTH_PROVIDER", message, { cause });
  }
}
export class EmailDeliveryError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super("EMAIL_DELIVERY", message, { cause });
  }
}
