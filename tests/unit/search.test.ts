import { describe, expect, it } from "vitest";
import { MAX_SEARCH_LENGTH, normalizeSearchTerm } from "@/domain/search";

describe("normalizeSearchTerm", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeSearchTerm("  wool   throw ")).toBe("wool throw");
  });

  it("strips characters that could alter a filter expression", () => {
    expect(normalizeSearchTerm("a,name.eq.x),(b")).toBe("a name.eq.x b");
    expect(normalizeSearchTerm("100%_off\\ \"quoted\" *")).toBe("100 off quoted");
  });

  it("keeps letters from any script, digits, hyphens and apostrophes", () => {
    expect(normalizeSearchTerm("Café 75% T-shirt men's")).toBe("Café 75 T-shirt men's");
    expect(normalizeSearchTerm("日本茶")).toBe("日本茶");
  });

  it("returns null when nothing searchable remains", () => {
    expect(normalizeSearchTerm("")).toBeNull();
    expect(normalizeSearchTerm("   ")).toBeNull();
    expect(normalizeSearchTerm("%%%,,,")).toBeNull();
    expect(normalizeSearchTerm(null)).toBeNull();
    expect(normalizeSearchTerm(undefined)).toBeNull();
  });

  it("caps length", () => {
    expect(normalizeSearchTerm("a".repeat(500))).toHaveLength(MAX_SEARCH_LENGTH);
  });
});
