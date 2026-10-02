-- 0002_rls.sql
-- Row Level Security. SUPABASE-SPECIFIC: relies on auth.uid() and the anon/authenticated roles.
-- The service_role key bypasses RLS and is used server-side only (order creation, email status).
-- See docs/rls.md for the rationale.

alter table profiles    enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- profiles: a user can read and write only their own profile.
create policy profiles_select_own on profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_own on profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- products: anyone may read ACTIVE products. No write policies: writes need the service role.
create policy products_select_active on products for select to anon, authenticated
  using (is_active);

-- orders: owners may read their own orders. Inserts/updates happen only via place_order / service role.
create policy orders_select_own on orders for select to authenticated
  using (user_id = (select auth.uid()));

-- order_items: readable when the parent order is readable.
create policy order_items_select_own on order_items for select to authenticated
  using (exists (
    select 1 from orders o where o.id = order_items.order_id and o.user_id = (select auth.uid())
  ));
