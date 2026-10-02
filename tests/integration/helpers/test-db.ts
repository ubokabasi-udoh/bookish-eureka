import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const sql = (file: string) => readFileSync(join(root, file), "utf8");

/** Boots an in-process Postgres with Supabase-like roles and a stubbed auth.uid(). */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  await db.exec(sql("database/migrations/0001_schema.sql"));
  // Supabase grants table privileges to API roles by default; RLS then restricts rows.
  await db.exec(`
    grant usage on schema public to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
  `);
  await db.exec(sql("database/migrations/0002_rls.sql"));
  await db.exec(sql("database/migrations/0003_place_order_fn.sql"));
  return db;
}

export async function seed(db: PGlite): Promise<void> {
  await db.exec(sql("database/seed/seed.sql"));
}

export async function asRole<T>(db: PGlite, role: "anon" | "authenticated" | "service_role", userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
