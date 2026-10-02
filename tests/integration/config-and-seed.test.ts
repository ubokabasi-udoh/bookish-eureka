import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ConfigError, getDriver, getSupabaseConfig, getSupabaseServiceRoleKey } from "@/integrations/config";
import { renderSeedSql, SEED_PRODUCTS } from "@/integrations/database/seed-data";

describe("integration config", () => {
  it("defaults to the live driver", () => {
    expect(getDriver({ NODE_ENV: "development" })).toBe("live");
  });

  it("rejects unknown drivers", () => {
    expect(() => getDriver({ INTEGRATIONS_DRIVER: "mock" } as unknown as NodeJS.ProcessEnv)).toThrow(ConfigError);
  });

  it("blocks the fake memory driver in production unless explicitly allowed", () => {
    const prod = { NODE_ENV: "production", INTEGRATIONS_DRIVER: "memory" } as unknown as NodeJS.ProcessEnv;
    expect(() => getDriver(prod)).toThrow(/blocked in production/);
    expect(getDriver({ ...prod, ALLOW_MEMORY_DRIVER: "true" })).toBe("memory");
    expect(getDriver({ NODE_ENV: "development", INTEGRATIONS_DRIVER: "memory" } as unknown as NodeJS.ProcessEnv)).toBe("memory");
  });

  it("reports every missing Supabase variable by name, never by value", () => {
    expect(() => getSupabaseConfig({} as NodeJS.ProcessEnv)).toThrow(/NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(() => getSupabaseServiceRoleKey({} as NodeJS.ProcessEnv)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: " https://x.supabase.co ", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" } as unknown as NodeJS.ProcessEnv))
      .toEqual({ url: "https://x.supabase.co", anonKey: "k" });
  });
});

describe("seed data", () => {
  it("database/seed/seed.sql matches the TypeScript source of truth", () => {
    const onDisk = readFileSync("database/seed/seed.sql", "utf8");
    expect(onDisk).toBe(renderSeedSql());
  });

  it("has unique slugs and SKUs and an image file for every product", () => {
    expect(new Set(SEED_PRODUCTS.map((p) => p.slug)).size).toBe(SEED_PRODUCTS.length);
    expect(new Set(SEED_PRODUCTS.map((p) => p.sku)).size).toBe(SEED_PRODUCTS.length);
    for (const p of SEED_PRODUCTS) expect(() => readFileSync(`public/products/${p.slug}.svg`)).not.toThrow();
  });

  it("includes featured, low-stock and out-of-stock examples", () => {
    expect(SEED_PRODUCTS.some((p) => p.isFeatured)).toBe(true);
    expect(SEED_PRODUCTS.some((p) => p.stockQuantity === 0)).toBe(true);
    expect(SEED_PRODUCTS.some((p) => p.stockQuantity > 0 && p.stockQuantity <= 5)).toBe(true);
  });
});
