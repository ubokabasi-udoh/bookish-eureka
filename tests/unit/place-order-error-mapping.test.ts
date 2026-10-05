import { describe, expect, it } from "vitest";
import {
  CurrencyMismatchError,
  EmptyCartError,
  InsufficientStockError,
  ProductUnavailableError,
  RepositoryError,
  ValidationError,
} from "@/domain/errors";
import { errorFromPlaceOrder } from "@/integrations/database/repositories/order.supabase";

describe("errorFromPlaceOrder", () => {
  it("maps each CODE:detail message from the SQL function to a domain error", () => {
    expect(errorFromPlaceOrder("EMPTY_CART", null)).toBeInstanceOf(EmptyCartError);
    expect(errorFromPlaceOrder("INVALID_QUANTITY:abc", null)).toBeInstanceOf(ValidationError);
    expect(errorFromPlaceOrder("CURRENCY_MISMATCH", null)).toBeInstanceOf(CurrencyMismatchError);

    const unavailable = errorFromPlaceOrder("PRODUCT_UNAVAILABLE:11111111-1111-4111-8111-111111111111", null);
    expect(unavailable).toBeInstanceOf(ProductUnavailableError);
    expect((unavailable as ProductUnavailableError).productId).toBe("11111111-1111-4111-8111-111111111111");

    const stock = errorFromPlaceOrder("INSUFFICIENT_STOCK:11111111-1111-4111-8111-111111111111:3", null);
    expect(stock).toBeInstanceOf(InsufficientStockError);
    expect((stock as InsufficientStockError).available).toBe(3);
  });

  it("falls back to a repository error for anything it does not recognize, keeping the cause", () => {
    const cause = new Error("boom");
    const result = errorFromPlaceOrder("some postgres detail", cause);
    expect(result).toBeInstanceOf(RepositoryError);
    expect((result.cause as Error).message).toBe("boom");
  });
});