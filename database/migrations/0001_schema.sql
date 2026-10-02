-- 0001_schema.sql
-- Portable PostgreSQL schema (works on Supabase, Neon, or any Postgres 13+).
-- Money is stored as integer minor units (cents).

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles: application user, keyed by the auth provider's user id.
-- (No FK to auth.users on purpose, so the schema stays provider-independent.)
create table profiles (
  id          uuid primary key,
  email       text not null check (position('@' in email) > 1),
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

create table products (
  id              uuid primary key default gen_random_uuid(),
  sku             text unique,
  name            text not null check (length(trim(name)) > 0),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description     text not null default '',
  price_cents     integer not null check (price_cents >= 0),
  currency        char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  image_url       text not null,
  category        text not null check (length(trim(category)) > 0),
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  is_active       boolean not null default true,
  is_featured     boolean not null default false,
  rating          numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index products_category_idx on products (category) where is_active;
create index products_featured_idx on products (is_featured) where is_active and is_featured;
create index products_name_lower_idx on products (lower(name));
create trigger products_set_updated_at before update on products
  for each row execute function set_updated_at();

create table orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles (id) on delete restrict,
  status                text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  subtotal_cents        integer not null check (subtotal_cents >= 0),
  total_cents           integer not null check (total_cents >= 0),
  currency              char(3) not null check (currency ~ '^[A-Z]{3}$'),
  customer_name         text not null check (length(trim(customer_name)) > 0),
  customer_email        text not null check (position('@' in customer_email) > 1),
  customer_phone        text,
  shipping_line1        text not null,
  shipping_line2        text,
  shipping_city         text not null,
  shipping_region       text not null,
  shipping_postal_code  text not null,
  shipping_country      text not null,
  email_status          text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  email_error           text,
  email_sent_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index orders_user_created_idx on orders (user_id, created_at desc);
create index orders_email_status_idx on orders (email_status) where email_status <> 'sent';
create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

-- order_items keeps a snapshot of name and price so history survives catalog changes.
create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders (id) on delete cascade,
  product_id        uuid references products (id) on delete set null,
  product_name      text not null,
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  quantity          integer not null check (quantity > 0),
  subtotal_cents    integer not null check (subtotal_cents = unit_price_cents * quantity)
);
create index order_items_order_idx on order_items (order_id);
create index order_items_product_idx on order_items (product_id);
