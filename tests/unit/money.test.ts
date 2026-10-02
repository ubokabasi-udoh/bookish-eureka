import { describe, expect, it } from "vitest";
import { formatMoney, multiplyCents } from "@/domain/money";

describe("money", () => {
  it("formats integer cents as currency", () => {
    expect(formatMoney(12900, "USD")).toBe("$129.00");
    expect(formatMoney(5, "USD")).toBe("$0.05");
    expect(formatMoney(0, "USD")).toBe("$0.00");
  });

  it("multiplies without floating point drift", () => {
    expect(multiplyCents(1999, 3)).toBe(5997);
    expect(multiplyCents(10, 3)).toBe(30);
  });
});
