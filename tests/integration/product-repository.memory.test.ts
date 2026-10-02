import { describe, expect, it } from "vitest";
import { MemoryProductRepository } from "@/integrations/database/memory/product-repository";
import { createMemoryStore } from "@/integrations/database/memory/store";
import { describeProductRepositoryContract } from "./contracts/product-repository.contract";

describeProductRepositoryContract("memory", () => new MemoryProductRepository(createMemoryStore()));

describe("MemoryProductRepository: inactive products", () => {
  it("hides inactive products from every read path", async () => {
    const store = createMemoryStore();
    const repo = new MemoryProductRepository(store);
    const candle = (await repo.getBySlug("soy-wax-candle"))!;
    store.products.set(candle.id, { ...candle, isActive: false });

    expect(await repo.getBySlug("soy-wax-candle")).toBeNull();
    expect((await repo.list()).map((p) => p.slug)).not.toContain("soy-wax-candle");
    expect(await repo.getByIds([candle.id])).toEqual([]);
    expect((await repo.listRelated({ id: "x", category: "Home" }, 10)).map((p) => p.slug)).not.toContain("soy-wax-candle");
  });
});
