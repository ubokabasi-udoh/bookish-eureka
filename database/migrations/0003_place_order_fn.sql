-- 0003_place_order_fn.sql
-- Atomic checkout. Prices and stock come from the database, never from the caller.
--
-- p_items: [{"productId": "<uuid>", "quantity": <int>}, ...]
-- p_customer: {"name","email","phone","line1","line2","city","region","postalCode","country"}
--
-- Errors are raised as 'CODE:detail' so adapters can map them to domain errors:
--   EMPTY_CART, INVALID_QUANTITY:<id>, PRODUCT_UNAVAILABLE:<id>,
--   INSUFFICIENT_STOCK:<id>:<available>, CURRENCY_MISMATCH

create or replace function place_order(p_user_id uuid, p_customer jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_line      record;
  v_product   products%rowtype;
  v_order_id  uuid;
  v_subtotal  integer := 0;
  v_currency  char(3);
begina
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Validate each submitted line BEFORE merging duplicates (so 10 + -5 cannot sneak through).
  for v_line in
    select (e->>'productId') as product_id, (e->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items) e
  loop
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'INVALID_QUANTITY:%', v_line.product_id;
    end if;
  end loop;

  create temp table if not exists _po_lines (
    product_id uuid primary key, quantity integer not null, name text, unit integer
  ) on commit drop;
  truncate _po_lines;

  -- Merge duplicate product lines.
  insert into _po_lines (product_id, quantity)
  select (e->>'productId')::uuid, sum((e->>'quantity')::integer)
  from jsonb_array_elements(p_items) e
  group by 1;

  -- Lock rows in a stable order (prevents deadlocks and overselling).
  for v_line in select product_id, quantity from _po_lines order by product_id loop
    select * into v_product from products where id = v_line.product_id for update;

    if not found or not v_product.is_active then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_line.product_id;
    end if;
    if v_product.stock_quantity < v_line.quantity then
      raise exception 'INSUFFICIENT_STOCK:%:%', v_line.product_id, v_product.stock_quantity;
    end if;
    if v_currency is null then
      v_currency := v_product.currency;
    elsif v_currency <> v_product.currency then
      raise exception 'CURRENCY_MISMATCH';
    end if;

    update _po_lines set name = v_product.name, unit = v_product.price_cents
      where product_id = v_line.product_id;
    v_subtotal := v_subtotal + v_product.price_cents * v_line.quantity;
  end loop;

  insert into orders (
    user_id, status, subtotal_cents, total_cents, currency,
    customer_name, customer_email, customer_phone,
    shipping_line1, shipping_line2, shipping_city, shipping_region, shipping_postal_code, shipping_country
  ) values (
    p_user_id, 'confirmed', v_subtotal, v_subtotal, v_currency,
    p_customer->>'name', p_customer->>'email', nullif(p_customer->>'phone', ''),
    p_customer->>'line1', nullif(p_customer->>'line2', ''), p_customer->>'city',
    p_customer->>'region', p_customer->>'postalCode', p_customer->>'country'
  ) returning id into v_order_id;

  insert into order_items (order_id, product_id, product_name, unit_price_cents, quantity, subtotal_cents)
  select v_order_id, product_id, name, unit, quantity, unit * quantity from _po_lines;

  update products p set stock_quantity = p.stock_quantity - l.quantity
  from _po_lines l where p.id = l.product_id;

  return v_order_id;
end;
$$;

-- Only the server (service role) may place orders; browsers must never call this directly.
revoke all on function place_order(uuid, jsonb, jsonb) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function place_order(uuid, jsonb, jsonb) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function place_order(uuid, jsonb, jsonb) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function place_order(uuid, jsonb, jsonb) to service_role;
  end if;
end
$$;
