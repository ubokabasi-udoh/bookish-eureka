import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asRole, createTestDb, seed } from "./helpers/test-db";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const customer = {
  name: "Ada Lovelace", email: "ada@example.com", phone: "",
  line1: "1 Analytical St", line2: "", city: "London", region: "LDN", postalCode: "N1 1AA", country: "GB",
};

let db: PGlite;

async function productId(slug: string): Promise<string> {
  const r = await db.query<{ id: string }>("select id from products where slug = $1", [slug]);
  return r.rows[0].id;
}
async function stock(slug: string): Promise<number> {
  const r = await db.query<{ s: number }>("select stock_quantity as s from products where slug = $1", [slug]);
  return r.rows[0].s;
}
async function place(userId: string, items: { productId: string; quantity: number }[]) {
  const r = await db.query<{ place_order: string }>("select place_order($1, $2::jsonb, $3::jsonb)", [
    userId, JSON.stringify(customer), JSON.stringify(items),
  ]);
  return r.rows[0].place_order;
}

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec("truncate order_items, orders, profiles, products cascade");
  await seed(db);
  await db.exec(`insert into profiles (id, email) values ('${USER_A}', 'a@example.com'), ('${USER_B}', 'b@example.com')`);
});

describe("schema and seed", () => {
  it("seeds a realistic catalog", async () => {
    const r = await db.query<{ n: number; cats: number }>("select count(*)::int n, count(distinct category)::int cats from products");
    expect(r.rows[0].n).toBeGreaterThanOrEqual(10);
    expect(r.rows[0].cats).toBeGreaterThanOrEqual(3);
  });

  it("seed is idempotent", async () => {
    await seed(db);
    const r = await db.query<{ n: number }>("select count(*)::int n from products");
    expect(r.rows[0].n).toBe(16);
  });

  it("rejects negative stock and non-positive quantities via constraints", async () => {
    await expect(db.exec("update products set stock_quantity = -1")).rejects.toThrow();
    const id = await productId("soy-wax-candle");
    const oid = await place(USER_A, [{ productId: id, quantity: 1 }]);
    await expect(
      db.exec(`insert into order_items (order_id, product_id, product_name, unit_price_cents, quantity, subtotal_cents)
               values ('${oid}', '${id}', 'x', 100, 0, 0)`),
    ).rejects.toThrow();
  });

  it("rejects item subtotals that do not match price x quantity", async () => {
    const id = await productId("soy-wax-candle");
    const oid = await place(USER_A, [{ productId: id, quantity: 1 }]);
    await expect(
      db.exec(`insert into order_items (order_id, product_id, product_name, unit_price_cents, quantity, subtotal_cents)
               values ('${oid}', '${id}', 'x', 100, 2, 999)`),
    ).rejects.toThrow();
  });
});

describe("place_order", () => {
  it("creates order and items, prices from the DB, and decrements stock", async () => {
    const candle = await productId("soy-wax-candle"); // 2800 cents
    const tee = await productId("organic-cotton-tee"); // 3400 cents
    const before = { candle: await stock("soy-wax-candle"), tee: await stock("organic-cotton-tee") };

    const oid = await place(USER_A, [
      { productId: candle, quantity: 2 },
      { productId: tee, quantity: 1 },
    ]);

    const order = (await db.query<{ subtotal_cents: number; total_cents: number; status: string; email_status: string; currency: string }>(
      "select * from orders where id = $1", [oid])).rows[0];
    expect(order.subtotal_cents).toBe(2 * 2800 + 3400);
    expect(order.total_cents).toBe(order.subtotal_cents);
    expect(order.status).toBe("confirmed");
    expect(order.email_status).toBe("pending");
    expect(order.currency).toBe("USD");

    const items = (await db.query<{ product_name: string; quantity: number; subtotal_cents: number }>(
      "select * from order_items where order_id = $1 order by product_name", [oid])).rows;
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.product_name === "Soy Wax Candle")?.subtotal_cents).toBe(5600);

    expect(await stock("soy-wax-candle")).toBe(before.candle - 2);
    expect(await stock("organic-cotton-tee")).toBe(before.tee - 1);
  });

  it("merges duplicate lines for the same product", async () => {
    const id = await productId("soy-wax-candle");
    const oid = await place(USER_A, [{ productId: id, quantity: 1 }, { productId: id, quantity: 2 }]);
    const r = await db.query<{ quantity: number }>("select quantity from order_items where order_id = $1", [oid]);
    expect(r.rows).toEqual([{ quantity: 3 }]);
  });

  it("rejects insufficient stock and changes nothing", async () => {
    const id = await productId("wool-throw-blanket"); // stock 3
    const candle = await productId("soy-wax-candle");
    const candleBefore = await stock("soy-wax-candle");
    await expect(place(USER_A, [{ productId: candle, quantity: 1 }, { productId: id, quantity: 4 }]))
      .rejects.toThrow(/INSUFFICIENT_STOCK:.*:3/);
    expect(await stock("wool-throw-blanket")).toBe(3);
    expect(await stock("soy-wax-candle")).toBe(candleBefore);
    expect((await db.query("select 1 from orders")).rows).toHaveLength(0);
  });

  it("rejects out-of-stock, inactive, and unknown products", async () => {
    const oos = await productId("walnut-desk-organizer"); // stock 0
    await expect(place(USER_A, [{ productId: oos, quantity: 1 }])).rejects.toThrow(/INSUFFICIENT_STOCK/);

    const candle = await productId("soy-wax-candle");
    await db.exec("update products set is_active = false where slug = 'soy-wax-candle'");
    await expect(place(USER_A, [{ productId: candle, quantity: 1 }])).rejects.toThrow(/PRODUCT_UNAVAILABLE/);

    await expect(place(USER_A, [{ productId: "99999999-9999-4999-8999-999999999999", quantity: 1 }]))
      .rejects.toThrow(/PRODUCT_UNAVAILABLE/);
  });

  it("rejects empty carts and cannot be tricked with negative duplicate quantities", async () => {
    await expect(place(USER_A, [])).rejects.toThrow(/EMPTY_CART/);
    const id = await productId("soy-wax-candle");
    await expect(place(USER_A, [{ productId: id, quantity: 10 }, { productId: id, quantity: -5 }]))
      .rejects.toThrow(/INVALID_QUANTITY/);
  });

  it("never oversells: sequential orders cannot exceed stock", async () => {
    const id = await productId("wool-throw-blanket"); // stock 3
    await place(USER_A, [{ productId: id, quantity: 2 }]);
    await expect(place(USER_B, [{ productId: id, quantity: 2 }])).rejects.toThrow(/INSUFFICIENT_STOCK:.*:1/);
    expect(await stock("wool-throw-blanket")).toBe(1);
  });

  it("preserves history when prices change or products are deleted", async () => {
    const id = await productId("soy-wax-candle");
    const oid = await place(USER_A, [{ productId: id, quantity: 1 }]);
    await db.exec("update products set price_cents = 99999, name = 'Renamed' where slug = 'soy-wax-candle'");
    await db.exec("delete from products where slug = 'soy-wax-candle'");
    const r = await db.query<{ product_id: string | null; product_name: string; unit_price_cents: number }>(
      "select * from order_items where order_id = $1", [oid]);
    expect(r.rows[0]).toMatchObject({ product_id: null, product_name: "Soy Wax Candle", unit_price_cents: 2800 });
  });
});

describe("row level security", () => {
  it("anon sees only active products and cannot write", async () => {
    await db.exec("update products set is_active = false where slug = 'soy-wax-candle'");
    const rows = await asRole(db, "anon", null, async () => (await db.query<{ slug: string }>("select slug from products")).rows);
    expect(rows).toHaveLength(15);
    expect(rows.some((r) => r.slug === "soy-wax-candle")).toBe(false);
    await asRole(db, "anon", null, async () => {
      const upd = await db.query("update products set price_cents = 1 returning id");
      expect(upd.rows).toHaveLength(0); // RLS: no update policy -> no rows affected
    });
  });

  it("users read only their own orders and items", async () => {
    const id = await productId("soy-wax-candle");
    await place(USER_A, [{ productId: id, quantity: 1 }]);
    await place(USER_B, [{ productId: id, quantity: 1 }]);
    const asA = await asRole(db, "authenticated", USER_A, async () => ({
      orders: (await db.query<{ user_id: string }>("select user_id from orders")).rows,
      items: (await db.query("select * from order_items")).rows,
    }));
    expect(asA.orders).toEqual([{ user_id: USER_A }]);
    expect(asA.items).toHaveLength(1);
  });

  it("users cannot insert orders or read others' profiles directly", async () => {
    await asRole(db, "authenticated", USER_A, async () => {
      await expect(db.exec(`insert into orders (user_id, subtotal_cents, total_cents, currency, customer_name, customer_email,
        shipping_line1, shipping_city, shipping_region, shipping_postal_code, shipping_country)
        values ('${USER_A}', 0, 0, 'USD', 'x', 'x@x.com', 'a', 'b', 'c', 'd', 'e')`)).rejects.toThrow();
      const profiles = (await db.query<{ id: string }>("select id from profiles")).rows;
      expect(profiles).toEqual([{ id: USER_A }]);
    });
  });

  it("only the service role may execute place_order", async () => {
    const id = await productId("soy-wax-candle");
    const call = () => db.query("select place_order($1, $2::jsonb, $3::jsonb)", [
      USER_A, JSON.stringify(customer), JSON.stringify([{ productId: id, quantity: 1 }]),
    ]);
    await asRole(db, "anon", null, async () => { await expect(call()).rejects.toThrow(/permission denied/i); });
    await asRole(db, "authenticated", USER_A, async () => { await expect(call()).rejects.toThrow(/permission denied/i); });
    await asRole(db, "service_role", null, async () => { await expect(call()).resolves.toBeDefined(); });
  });
});
