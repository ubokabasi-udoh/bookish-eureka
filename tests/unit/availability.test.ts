import { describe, expect, it } from "vitest";
import { canPurchase, getAvailability, LOW_STOCK_THRESHOLD, maxPurchasable } from "@/domain/availability";

const p = (stockQuantity: number, isActive = true) => ({ stockQuantity, isActive });

describe("availability", () => {
  it("classifies stock levels", () => {
    expect(getAvailability(p(100))).toBe("in_stock");
    expect(getAvailability(p(LOW_STOCK_THRESHOLD + 1))).toBe("in_stock");
    expect(getAvailability(p(LOW_STOCK_THRESHOLD))).toBe("low_stock");
    expect(getAvailability(p(1))).toBe("low_stock");
    expect(getAvailability(p(0))).toBe("out_of_stock");
  });

  it("treats inactive products as unavailable regardless of stock", () => {
    expect(getAvailability(p(50, false))).toBe("unavailable");
    expect(canPurchase(p(50, false))).toBe(false);
    expect(maxPurchasable(p(50, false))).toBe(0);
  });

  it("caps purchasable quantity at stock", () => {
    expect(maxPurchasable(p(7))).toBe(7);
    expect(maxPurchasable(p(0))).toBe(0);
    expect(canPurchase(p(1))).toBe(true);
  });
});
