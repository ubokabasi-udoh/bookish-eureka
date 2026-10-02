import { describe, expect, it } from "vitest";
import type { ProductRepository } from "@/domain/ports";

/**
 * Behaviour every ProductRepository must have, assuming database/seed/seed.sql content.
 * Run against the in-memory adapter always, and against Supabase when credentials are present.
 */
export function describeProductRepositoryContract(name: string, create: () => ProductRepository, options: { skip?: boolean } = {}) {
  describe.skipIf(options.skip)(`ProductRepository contract: ${name}`, () => {
    const repo = create();

    it("lists active products sorted by name", async () => {
      const products = await repo.list();
      expect(products.length).toBeGreaterThanOrEqual(10);
      const names = products.map((p) => p.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      expect(products.every((p) => p.isActive)).toBe(true);
    });

    it("filters by category case-insensitively", async () => {
      const home = await repo.list({ category: "home" });
      expect(home.length).toBeGreaterThan(0);
      expect(home.every((p) => p.category === "Home")).toBe(true);
    });

    it("searches name and description, case-insensitively", async () => {
      const byName = await repo.list({ search: "WOOL" });
      expect(byName.map((p) => p.slug)).toContain("wool-throw-blanket");
      const byDescription = await repo.list({ search: "bergamot" });
      expect(byDescription.map((p) => p.slug)).toEqual(["soy-wax-candle"]);
    });

    it("combines search and category", async () => {
      const results = await repo.list({ search: "leather", category: "Accessories" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((p) => p.category === "Accessories")).toBe(true);
      expect(await repo.list({ search: "leather", category: "Tech" })).toEqual([]);
    });

    it("treats filter syntax in search text as plain text", async () => {
      await expect(repo.list({ search: "x,name.eq.wool),(a" })).resolves.toEqual([]);
      await expect(repo.list({ search: "%" })).resolves.toHaveLength((await repo.list()).length);
    });

    it("paginates", async () => {
      const all = await repo.list({ limit: 100 });
      const page = await repo.list({ limit: 5, offset: 5 });
      expect(page.map((p) => p.id)).toEqual(all.slice(5, 10).map((p) => p.id));
    });

    it("lists featured products, best rated first", async () => {
      const featured = await repo.listFeatured(4);
      expect(featured).toHaveLength(4);
      expect(featured.every((p) => p.isFeatured)).toBe(true);
      const ratings = featured.map((p) => p.rating ?? 0);
      expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    });

    it("lists distinct categories", async () => {
      const categories = await repo.listCategories();
      expect(categories).toEqual(expect.arrayContaining(["Apparel", "Home", "Accessories", "Tech"]));
      expect(new Set(categories).size).toBe(categories.length);
    });

    it("gets a product by slug, or null", async () => {
      const found = await repo.getBySlug("merino-crew-sweater");
      expect(found).toMatchObject({ name: "Merino Crew Sweater", priceCents: 12900, currency: "USD", category: "Apparel" });
      expect(await repo.getBySlug("does-not-exist")).toBeNull();
    });

    it("gets products by id and silently omits unknown ids", async () => {
      const sweater = (await repo.getBySlug("merino-crew-sweater"))!;
      const candle = (await repo.getBySlug("soy-wax-candle"))!;
      const found = await repo.getByIds([sweater.id, candle.id, "99999999-9999-4999-8999-999999999999"]);
      expect(found.map((p) => p.id).sort()).toEqual([sweater.id, candle.id].sort());
      expect(await repo.getByIds([])).toEqual([]);
    });

    it("lists related products from the same category, excluding the product itself", async () => {
      const sweater = (await repo.getBySlug("merino-crew-sweater"))!;
      const related = await repo.listRelated(sweater, 3);
      expect(related).toHaveLength(3);
      expect(related.every((p) => p.category === "Apparel" && p.id !== sweater.id)).toBe(true);
    });

    it("includes out-of-stock products with zero stock (they are still browsable)", async () => {
      const organizer = await repo.getBySlug("walnut-desk-organizer");
      expect(organizer?.stockQuantity).toBe(0);
    });
  });
}
