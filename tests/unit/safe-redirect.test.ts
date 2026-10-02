import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("allows same-site relative paths, preserving query and hash", () => {
    expect(safeRedirectPath("/checkout")).toBe("/checkout");
    expect(safeRedirectPath("/shop?category=Home&q=mug#top")).toBe("/shop?category=Home&q=mug#top");
  });

  it.each([
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "https://evil.com",
    "http://evil.com/x",
    "javascript:alert(1)",
    "evil.com",
    "/%0d%0aSet-Cookie:x=1".replace("%0d%0a", "\r\n"),
    "/a\\b",
    "",
  ])("rejects %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });

  it("rejects non-strings and overlong input, using the fallback", () => {
    expect(safeRedirectPath(null, "/home")).toBe("/home");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath(42)).toBe("/");
    expect(safeRedirectPath(`/${"a".repeat(600)}`)).toBe("/");
  });
});
