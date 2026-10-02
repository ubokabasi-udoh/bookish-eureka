import { describe, expect, it } from "vitest";
import { completeSignIn, requireUser } from "@/application/auth/complete-sign-in";
import { browseCatalog, getHomeData, getProductDetail } from "@/application/catalog/catalog";
import type { AuthUser } from "@/domain/entities";
import { AuthProviderError, AuthRequiredError } from "@/domain/errors";
import type { AuthService } from "@/domain/ports";
import { MemoryProductRepository } from "@/integrations/database/memory/product-repository";
import { MemoryProfileRepository } from "@/integrations/database/memory/profile-repository";
import { createMemoryStore } from "@/integrations/database/memory/store";

const user: AuthUser = { id: "11111111-1111-4111-8111-111111111111", email: "ada@example.com", name: "Ada", avatarUrl: null };

function fakeAuth(overrides: Partial<AuthService> = {}): AuthService {
  return {
    getCurrentUser: async () => null,
    startGoogleSignIn: async () => ({ url: "https://example.test" }),
    completeSignIn: async () => user,
    signOut: async () => undefined,
    ...overrides,
  };
}

describe("catalog use cases", () => {
  const products = new MemoryProductRepository(createMemoryStore());

  it("browses with a normalized search term", async () => {
    const page = await browseCatalog({ products }, { search: "  WOOL  ,, " });
    expect(page.search).toBe("WOOL");
    expect(page.products.map((p) => p.slug)).toContain("wool-throw-blanket");
  });

  it("resolves category case-insensitively and returns the canonical name", async () => {
    const page = await browseCatalog({ products }, { category: "tech" });
    expect(page.category).toBe("Tech");
    expect(page.products.every((p) => p.category === "Tech")).toBe(true);
  });

  it("returns no products for an unknown category instead of everything", async () => {
    const page = await browseCatalog({ products }, { category: "Weapons" });
    expect(page.products).toEqual([]);
    expect(page.categories.length).toBeGreaterThan(0);
  });

  it("returns product detail with related products, or null", async () => {
    const detail = await getProductDetail({ products }, "ceramic-pour-over-set");
    expect(detail?.product.name).toBe("Ceramic Pour-Over Set");
    expect(detail?.related.length).toBeGreaterThan(0);
    expect(await getProductDetail({ products }, "nope")).toBeNull();
  });

  it("provides home data", async () => {
    const home = await getHomeData({ products });
    expect(home.featured.length).toBeGreaterThan(0);
    expect(home.categories).toContain("Home");
  });
});

describe("authentication use cases", () => {
  it("creates the profile when sign-in completes", async () => {
    const profiles = new MemoryProfileRepository(createMemoryStore());
    const result = await completeSignIn({ auth: fakeAuth(), profiles }, "code");
    expect(result).toEqual(user);
    expect(await profiles.getById(user.id)).toMatchObject({ email: "ada@example.com", fullName: "Ada" });
  });

  it("does not create a profile when the provider rejects the code", async () => {
    const profiles = new MemoryProfileRepository(createMemoryStore());
    const auth = fakeAuth({ completeSignIn: async () => { throw new AuthProviderError("bad code"); } });
    await expect(completeSignIn({ auth, profiles }, "bad")).rejects.toBeInstanceOf(AuthProviderError);
    expect(await profiles.getById(user.id)).toBeNull();
  });

  it("updates an existing profile instead of duplicating it", async () => {
    const store = createMemoryStore();
    const profiles = new MemoryProfileRepository(store);
    await profiles.upsertFromAuthUser(user);
    await profiles.upsertFromAuthUser({ ...user, name: "Ada L." });
    expect(store.profiles.size).toBe(1);
    expect((await profiles.getById(user.id))?.fullName).toBe("Ada L.");
  });

  it("requireUser returns the verified user or throws AuthRequiredError", async () => {
    await expect(requireUser({ auth: fakeAuth({ getCurrentUser: async () => user }) })).resolves.toEqual(user);
    await expect(requireUser({ auth: fakeAuth() })).rejects.toBeInstanceOf(AuthRequiredError);
  });
});
