# AGENT.md — Shop Application Implementation Plan

> Source of truth for the build. Any deviation must be recorded in the **Change Log** at the bottom before implementation continues.

---

## A. Project Understanding

**What it does.** A production-style e-commerce site ("Shop"): browse a database-backed catalog, view product details, manage a cart, sign in with Google, check out, persist orders transactionally, and receive an HTML confirmation email.

**Target users**
- *Shoppers*: browse, search, filter, buy.
- *Developer/operator*: clones the repo, configures Supabase, Google, and Mailgun by following the README, deploys to Vercel.

**Core user journeys**
1. Home → Shop → Product → Add to cart → Cart → Checkout → (Google sign-in) → Place order → Confirmation page → Email.
2. Search / filter by category on `/shop`.
3. Sign in / sign out; auth state visible in header.
4. Failure paths: out of stock, product deactivated, empty cart, email failure, OAuth failure, invalid route.

**Major features:** home page, shop listing (search, category filter, loading/empty/error states), product details with related products, cart, authenticated checkout, server-side order creation, order confirmation page, Mailgun email, 404 and error pages, seed data, tests, README with human setup.

**External integrations:** Supabase (PostgreSQL + Auth), Google OAuth (via Supabase Auth), Mailgun (transactional email).

**Technical architecture (layers, dependencies point inward only)**

```
app/ (routes, server actions) ─┐
components/, features/ (UI)    ├─► application/ (use cases) ─► domain/ (entities, rules, interfaces/ports)
                               │                                        ▲
integrations/ (adapters) ──────┴────────────────────────────────────────┘ implements ports
```

---

## B. Implementation Plan

Each step: Objective · Files · Dependencies · Acceptance criteria.

### 1. Project setup
- **Objective:** Next.js + TypeScript (strict) + Tailwind + shadcn/ui + ESLint + Vitest + Playwright.
- **Files:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example`.
- **Dependencies:** none.
- **Acceptance:** `npm run lint`, `typecheck`, `test`, `build` scripts exist and run on the empty scaffold.

### 2. Architecture and folder structure
- **Objective:** Create layers and the single integration boundary.
- **Files:** `src/domain/**` (entities, ports), `src/application/**` (use cases), `src/integrations/{database,auth,email}/**`, `src/integrations/container.ts` (composition root), `src/lib/**`, `src/types/**`.
- **Dependencies:** 1.
- **Acceptance:** ESLint `no-restricted-imports` blocks `@supabase/*` and Mailgun imports outside `src/integrations/**`; domain/application import nothing vendor-specific.

### 3. Database schema
- **Objective:** Migrations, constraints, indexes, RLS, transactional RPC.
- **Files:** `database/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_place_order_fn.sql`, `database/seed/seed.sql` (or `seed.ts`).
- **Dependencies:** 1.
- **Acceptance:** Tables `profiles`, `products`, `orders`, `order_items` with FKs, `CHECK` constraints (`stock_quantity >= 0`, `price >= 0`, `quantity > 0`), indexes (slug, category, is_active, orders.user_id), `orders.email_status` column; RLS policies documented; `place_order` function locks product rows (`FOR UPDATE`), validates stock, inserts order + items, decrements stock atomically.

### 4. Authentication
- **Objective:** Google sign-in/out and server-side session validation behind `AuthService`.
- **Files:** `src/domain/ports/auth-service.ts`, `src/integrations/auth/supabase-google.ts`, `src/integrations/auth/memory.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/sign-in`, middleware for session refresh, `src/features/auth/*`.
- **Dependencies:** 2, 3.
- **Acceptance:** `signInWithGoogle()`, `signOut()`, `getCurrentUser()` exist on the port; the UI never imports Google/Supabase; server actions reject unauthenticated callers; profile row created on first sign-in.

### 5. Product / catalog
- **Objective:** Listing, search, category filter, details, related products.
- **Files:** `ProductRepository` port, `integrations/database/repositories/product.supabase.ts`, `product.memory.ts`, `application/catalog/*`, `app/shop/page.tsx`, `app/shop/[slug]/page.tsx`, `features/catalog/*`, `loading.tsx`/`error.tsx` per route.
- **Dependencies:** 3, 2.
- **Acceptance:** Products come only from the repository; loading, empty and error states exist; unavailable products render a disabled state.

### 6. Cart
- **Objective:** Client cart that survives navigation, stock-capped.
- **Files:** `features/cart/cart-store.ts` (Zustand + `persist`), `domain/cart.ts` (pure calculations), `app/cart/page.tsx`, cart drawer/indicator.
- **Dependencies:** 5.
- **Acceptance:** Add/remove/increase/decrease; quantity capped at stock; subtotal, total quantity, total; persisted across reloads; cart stores only `{productId, quantity}` — never trusted for price.

### 7. Checkout
- **Objective:** Validated checkout form and summary.
- **Files:** `app/checkout/page.tsx`, `features/checkout/*`, `domain/schemas/checkout.ts` (Zod), React Hook Form.
- **Dependencies:** 4, 6.
- **Acceptance:** Auth required (redirect to sign-in with return path); empty cart blocked; accessible errors; prefilled name/email from session.

### 8. Order persistence
- **Objective:** Server-authoritative order creation.
- **Files:** `application/orders/place-order.ts`, `OrderRepository` port + Supabase/memory adapters (calls `place_order` RPC), `app/checkout/actions.ts`, `app/orders/[id]/page.tsx`.
- **Dependencies:** 3, 4, 7.
- **Acceptance:** Flow: validate user → validate payload (Zod) → re-fetch products → check active/stock → compute prices server-side → atomic RPC → return order. Client prices/totals ignored. Concurrent orders cannot oversell. Order items snapshot name/unit price.

### 9. Email integration
- **Objective:** Confirmation email via `EmailService`, failure-tolerant.
- **Files:** `domain/ports/email-service.ts`, `integrations/email/mailgun.ts` (REST via `fetch`), `integrations/email/mock.ts`, `integrations/email/templates/order-confirmation.ts`.
- **Dependencies:** 8.
- **Acceptance:** Email sent only from the application layer after the order commits; failure sets `orders.email_status = 'failed'` + `email_error`, is logged server-side, and the order still succeeds; success sets `'sent'`. HTML and text bodies include all fields required by the spec; user-supplied strings are HTML-escaped.

### 10. UI states and validation
- **Objective:** Polished, responsive, accessible UI.
- **Files:** `app/page.tsx`, `components/ui/*`, `components/layout/{header,footer,mobile-nav}`, `app/not-found.tsx`, `app/error.tsx`, toasts, skeletons, local SVG product images in `public/products/`.
- **Dependencies:** 5–9.
- **Acceptance:** Home sections per spec; verified at 375/768/1024/1440; semantic headings, labels, focus rings, alt text, `aria-live` errors; no external image dependencies.

### 11. Testing
- **Objective:** Unit, integration, E2E without real credentials.
- **Files:** `tests/unit/*`, `tests/integration/*`, `tests/e2e/*`, in-memory adapters.
- **Dependencies:** 2–10.
- **Acceptance:** Unit: cart/price/order calculations, Zod schemas. Integration: product retrieval, place-order (success, out-of-stock, inactive product, tampered price, email failure), mock email behavior. E2E: full journey using `INTEGRATIONS_DRIVER=memory`.

### 12. Documentation
- **Objective:** README for a first-time developer.
- **Files:** `README.md` (all 16 required sections + "Human Setup Required" checklist + per-integration docs: what, why, adapter location, env vars, human setup, how to test, how to replace), `docs/rls.md`.
- **Dependencies:** 1–11.
- **Acceptance:** Every README requirement in the spec is present; public vs server-only vs sensitive variables labelled.

### 13. Final verification
- **Objective:** Run all checks and compare against Definition of Done.
- **Acceptance:** `lint`, `typecheck`, `test`, `build` pass; manual QA recorded honestly; Implementation Status section filled in.

---

## C. Architecture Decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript strict | Server components/actions keep secrets server-side, SSR for catalog, Vercel-friendly. |
| Database | Supabase PostgreSQL behind repository ports | Plain SQL migrations + RPC keep the schema portable to Neon; business logic never calls the Supabase client. |
| Auth | Supabase Auth with Google provider, behind `AuthService` | Gives cookie sessions and RLS-aware identity without hand-rolling OAuth. Google Client ID/Secret live in the Supabase dashboard, so they are **not** app env vars. Swapping to Auth.js/Neon only replaces `integrations/auth`. |
| Email | Mailgun REST API via `fetch`, behind `EmailService` | No SDK dependency; easy to replace with Resend/etc. |
| Transactions | Postgres function `place_order` (RPC) with row locks | The Supabase JS client cannot run multi-statement transactions; a DB function is atomic and portable to any Postgres. |
| Validation | Zod (shared schemas) + React Hook Form | Same schema validates form and server action. |
| Styling | Tailwind CSS + shadcn/ui primitives | Consistent tokens, accessible components. |
| State | Zustand (`persist`) for cart only; everything else server-driven | Smallest tool that survives navigation; no Redux. |
| Images | Local SVG/optimized assets in `public/` via `next/image` | Spec forbids reliance on external image URLs. |
| Tests | Vitest + Playwright with in-memory adapters selected by `INTEGRATIONS_DRIVER` | No real Google/Mailgun/Supabase needed in CI. |

---

## D. Integration Boundary

All external services live exclusively in `src/integrations/**`.

- Domain/application code depends only on ports in `src/domain/ports/` (`ProductRepository`, `OrderRepository`, `ProfileRepository`, `AuthService`, `EmailService`).
- `src/integrations/container.ts` is the **only** place that chooses adapters (Supabase/Google/Mailgun vs. memory) based on environment.
- Vendor SDKs (`@supabase/*`) and vendor URLs (Mailgun) may be imported only inside `src/integrations/**`; enforced by ESLint `no-restricted-imports`.
- React components never call vendors; they call server actions/use cases, which receive services from the container.
- Replacing a vendor = writing a new adapter that implements the port and switching it in the container.

---

## E. Definition of Done

- [ ] `AGENT.md` exists with plan; implementation follows it; changes logged
- [ ] README complete, including Human Setup Required checklist and per-integration docs
- [ ] `.env.example` complete, with variables labelled Public / Server-only / Sensitive
- [ ] Migrations, RLS policies, and `place_order` RPC exist; seed has 10–20 products across categories
- [ ] Catalog, cart, checkout, order persistence, inventory decrement work
- [ ] Google OAuth and Mailgun adapters implemented against the real services
- [ ] Email failure does not fail the order; status recorded and logged
- [ ] No vendor imports outside `src/integrations/**`; no secrets in repo
- [ ] Zod validation on all inputs; server never trusts client prices, stock, identity
- [ ] Loading, empty, error, and confirmation states; responsive at 375/768/1024/1440; accessibility considered
- [ ] Unit, integration, E2E tests exist and pass without external credentials
- [ ] `npm run lint`, `typecheck`, `test`, `build` pass
- [ ] Manual QA done and reported honestly (Google/Mailgun marked unverified unless actually tested)
- [ ] Implementation Status section below completed

---

## Implementation Status

| # | Step | Status |
|---|---|---|
| 1 | Project setup | ✅ Completed |
| 2 | Architecture and folder structure | ✅ Completed |
| 3 | Database schema | ✅ Completed |
| 4 | Authentication | 🟡 Implemented (Supabase+Google adapter, memory adapter, proxy, sign-in page, callback, actions). Memory flow verified; **live Google/Supabase flow NOT verified** (needs human credentials). |
| 5 | Product / catalog | 🟡 Implemented (repositories, shop, product page, home, loading/empty/error states). 69 tests pass; HTTP verification of pages in progress. Add-to-cart UI arrives in step 6. |
| 6 | Cart | ✅ Implemented: pure `domain/cart.ts`, Zustand+persist store (ids and quantities only), hydration-safe hooks, add-to-cart / quick-add / stepper / header indicator, cart page with live stock reconciliation. Unit tested. |
| 7 | Checkout | ✅ Implemented: shared Zod schema, React Hook Form, auth-gated page with return path, prefilled name/email, empty-cart and unavailable-item guards. Schema unit tested. |
| 8 | Order persistence | ✅ Implemented: `placeOrder` use case, Supabase (`place_order` RPC) and memory order repositories, server action, `/orders/[id]` page scoped to the owner. Integration tested on the memory adapter and on real Postgres (PGlite). **Not run against a live Supabase project.** |
| 9 | Email integration | ✅ Implemented: Mailgun REST adapter, mock adapter, escaped HTML + text template, failure-tolerant status recording. Unit/integration tested with the mock. **Mailgun NOT verified against the real service.** |
| 10 | UI states and validation | 🟡 Mostly done: home sections, mobile nav, toaster, skeletons, 404 and error pages, accessible form errors. Responsive widths (375/768/1024/1440) **not manually verified**. |
| 11 | Testing | 🟡 121 Vitest tests pass (unit + integration, incl. migrations on PGlite). Playwright E2E written (`tests/e2e`): catalog/cart specs pass (4/4); the 3 sign-in → checkout specs were still failing when work stopped (redirect back to `/checkout` after the fake Google sign-in) and were not finished. |
| 12 | Documentation | ✅ README rewritten (see Change Log). |
| 13 | Final verification | 🟡 `lint`, `typecheck`, `test` pass; `build` result recorded in the README/summary. Live Google/Supabase/Mailgun flows **unverified** (need human credentials). |

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-10-02 | Initial plan created | — |
| 2026-10-02 | Money stored as integer `price_cents` (not decimal `price`) | Avoids floating-point errors; `domain/money.ts` formats for display. |
| 2026-10-02 | `profiles.id` has no FK to `auth.users`; id equals the auth provider's user id | Keeps `0001_schema.sql` portable to Neon. Supabase-specific pieces are isolated in `0002_rls.sql`. |
| 2026-10-02 | Service-role grant on `place_order` is guarded by `pg_roles` checks | Migration 0003 stays runnable on non-Supabase Postgres. |
| 2026-10-02 | Orders have separate shipping columns and `customer_phone` | Checkout collects customer/shipping info; explicit columns beat an opaque blob. |
| 2026-10-02 | `INTEGRATIONS_DRIVER` env var (`live` \| `memory`) added | Implements the plan's mock-adapter selection through the single composition root. |
| 2026-10-02 | Removed `vite-tsconfig-paths`; Vitest uses native `resolve.tsconfigPaths` | Plugin is obsolete on Vite 8. |
| 2026-10-02 | Added `@electric-sql/pglite` (dev) for migration/RPC tests on real Postgres | Verifies RLS and `place_order` without a live Supabase project. True parallel-connection concurrency is not covered by it. |
| 2026-10-02 | System font stack instead of `next/font/google` | Build must not depend on fetching fonts from a third-party CDN. |
| 2026-10-02 | Added `src/integrations/proxy.ts` as a second sanctioned entry point beside `container.ts` | `src/proxy.ts` (Next 16 replacement for `middleware.ts`) must refresh sessions but may not import adapters directly. |
| 2026-10-02 | Post-login destination stored in an httpOnly cookie, not in the OAuth callback URL | Keeps the Supabase/Google redirect allow-list exact (`/auth/callback`, no wildcard needed). |
| 2026-10-02 | `getByIds` / `getBySlug` return **active** products only (port doc to be updated) | Catalog reads use the anon key; RLS hides inactive rows. A missing id therefore means "unavailable". |
| 2026-10-02 | `shop/loading.tsx` moved into a `(list)` route group; no skeleton on the product page | A Suspense boundary above `notFound()` makes the server send HTTP 200 for missing products. Real 404s were chosen over a product skeleton. |
| 2026-10-02 | `SiteHeader` calls `connection()` so all routes render on demand | Auth state is per-request; static prerendering would run data queries at build time and break builds without credentials. |
| 2026-10-02 | Memory driver blocked in production unless `ALLOW_MEMORY_DRIVER=true` | Prevents accidentally shipping fake auth. |
| 2026-10-02 | Catalog pages and home are built in step 5 (home polish, promo section, mobile nav remain in step 10) | Needed to exercise the catalog end to end. |
| 2026-10-02 | **Bug fix:** `begina` typo in `0003_place_order_fn.sql` changed to `begin` | The migration failed to parse; this broke the PGlite migration test suite. |
| 2026-10-02 | Added `src/features/**` (cart, checkout) with client components; `features/cart/cart-actions.ts` is a server action returning products by id | Plan listed `features/*`; cart needs authoritative prices/stock without trusting the browser. |
| 2026-10-02 | `CurrencyMismatchError` added to the domain errors; `Services` gained `orders` and `email` | Order creation and email ports are now wired through the composition root. |
| 2026-10-02 | Order creation is delegated entirely to the `place_order` RPC; the use case also pre-reads products for friendly errors | Prices are never computed in TypeScript for real orders; the pre-read is only for messages and cannot oversell. |
| 2026-10-02 | Email is sent from `placeOrder` after the order commits and never throws; failures set `email_status='failed'` + `email_error` | Per plan step 9. |
| 2026-10-02 | Product images use `next/image` with `unoptimized` | SVGs are served as-is from `/public/products`; avoids enabling `dangerouslyAllowSVG`. |
| 2026-10-02 | Removed per-route `loading.tsx`/`error.tsx` under `orders/[id]` | A Suspense boundary above `notFound()` makes Next return HTTP 200 for missing orders; real 404s were chosen (same decision as the product page). |
| 2026-10-02 | `next.config.ts` reads `NEXT_DIST_DIR`; Playwright uses `.next-e2e` and `localhost:3100` | Next 16 allows one dev server per build dir, and blocks dev assets for `127.0.0.1`. |
| 2026-10-02 | Checkout schema messages customised (`Full name is required.` etc.) | Zod 4 reports `invalid_type` before `min` for missing fields. |
| 2026-10-02 | Remaining E2E sign-in specs left unfinished by request | Time-boxed; unit/integration coverage is complete and the manual flow is documented in the README. |
