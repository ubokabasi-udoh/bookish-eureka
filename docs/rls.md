# Row Level Security policies

Defined in `database/migrations/0002_rls.sql`. RLS is enabled on every table; nothing is disabled for convenience.
These policies are Supabase-specific (`auth.uid()`, `anon`/`authenticated` roles). When moving to Neon, replace
them with application-level authorization in the Postgres adapter; the rest of the schema is portable.

| Table | anon | authenticated | service_role (server only) |
|---|---|---|---|
| `products` | read **active** rows | read **active** rows | full (bypasses RLS) |
| `profiles` | none | read/insert/update **own** row | full |
| `orders` | none | read **own** rows | full |
| `order_items` | none | read rows of **own** orders | full |

Design notes
- There are **no** insert/update/delete policies on `orders`/`order_items`/`products`. Browsers can never write them.
- Orders are created only by `place_order(...)`, executable **only** by `service_role` (see `0003_place_order_fn.sql`).
- The server calls `place_order` after verifying the session server-side, passing the verified user id.
- Catalog reads use the anon-key client (RLS-protected); the service-role client is used only for order creation and
  email status updates, and is imported only inside `src/integrations/database`.
- Verified by `tests/integration/database-migrations.test.ts`, which runs the migrations on a real Postgres engine.
