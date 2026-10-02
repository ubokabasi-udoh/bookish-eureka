-- seed.sql — realistic demo catalog (16 products, 4 categories).
-- GENERATED from src/integrations/database/seed-data.ts — run `npm run db:seed:generate`; do not edit by hand.
-- Idempotent: safe to re-run. Images are local files served from /public/products.
insert into products
  (name, slug, sku, description, price_cents, currency, image_url, category, stock_quantity, is_active, is_featured, rating)
values
  ('Merino Crew Sweater', 'merino-crew-sweater', 'APP-001', 'Fine-gauge merino wool crewneck with a soft hand and a relaxed fit. Temperature-regulating and machine washable.', 12900, 'USD', '/products/merino-crew-sweater.svg', 'Apparel', 24, true, true, 4.8),
  ('Organic Cotton Tee', 'organic-cotton-tee', 'APP-002', 'Heavyweight organic cotton tee, garment-dyed for a lived-in feel from day one.', 3400, 'USD', '/products/organic-cotton-tee.svg', 'Apparel', 80, true, false, 4.5),
  ('Waxed Canvas Jacket', 'waxed-canvas-jacket', 'APP-003', 'Water-resistant waxed canvas field jacket with corduroy collar and four utility pockets.', 18900, 'USD', '/products/waxed-canvas-jacket.svg', 'Apparel', 9, true, true, 4.7),
  ('Linen Overshirt', 'linen-overshirt', 'APP-004', 'Breathable European linen overshirt, cut long enough to wear open over a tee.', 9800, 'USD', '/products/linen-overshirt.svg', 'Apparel', 15, true, false, 4.4),
  ('Ceramic Pour-Over Set', 'ceramic-pour-over-set', 'HOM-001', 'Hand-glazed ceramic dripper and carafe set for a slow, precise morning cup.', 5600, 'USD', '/products/ceramic-pour-over-set.svg', 'Home', 32, true, true, 4.9),
  ('Stoneware Dinner Plates (Set of 4)', 'stoneware-dinner-plates', 'HOM-002', 'Four reactive-glaze stoneware plates. Dishwasher and microwave safe.', 7200, 'USD', '/products/stoneware-dinner-plates.svg', 'Home', 18, true, false, 4.6),
  ('Wool Throw Blanket', 'wool-throw-blanket', 'HOM-003', 'Oversized lambswool throw woven in small batches. Only a few left this season.', 11000, 'USD', '/products/wool-throw-blanket.svg', 'Home', 3, true, true, 4.8),
  ('Soy Wax Candle', 'soy-wax-candle', 'HOM-004', 'Cedar and bergamot hand-poured soy candle with a 50-hour burn time.', 2800, 'USD', '/products/soy-wax-candle.svg', 'Home', 120, true, false, 4.3),
  ('Walnut Desk Organizer', 'walnut-desk-organizer', 'HOM-005', 'Solid walnut organizer with pen tray and phone stand. Currently out of stock.', 6400, 'USD', '/products/walnut-desk-organizer.svg', 'Home', 0, true, false, 4.5),
  ('Leather Card Wallet', 'leather-card-wallet', 'ACC-001', 'Vegetable-tanned leather slim wallet that develops a patina with use.', 5800, 'USD', '/products/leather-card-wallet.svg', 'Accessories', 45, true, true, 4.7),
  ('Canvas Weekender Bag', 'canvas-weekender-bag', 'ACC-002', 'Durable canvas duffel with leather handles and a padded shoulder strap.', 14500, 'USD', '/products/canvas-weekender-bag.svg', 'Accessories', 12, true, false, 4.6),
  ('Stainless Water Bottle', 'stainless-water-bottle', 'ACC-003', 'Double-wall insulated bottle that keeps drinks cold 24 hours or hot 12.', 3600, 'USD', '/products/stainless-water-bottle.svg', 'Accessories', 70, true, false, 4.4),
  ('Polarized Sunglasses', 'polarized-sunglasses', 'ACC-004', 'Acetate frames with polarized mineral lenses and full UV400 protection.', 8900, 'USD', '/products/polarized-sunglasses.svg', 'Accessories', 28, true, false, 4.5),
  ('Compact Mechanical Keyboard', 'mechanical-keyboard', 'TEC-001', '75% layout hot-swappable keyboard with PBT keycaps and wireless or USB-C.', 13900, 'USD', '/products/mechanical-keyboard.svg', 'Tech', 20, true, true, 4.8),
  ('Wireless Earbuds', 'wireless-earbuds', 'TEC-002', 'Active noise cancelling earbuds with 8 hours of playback and a wireless charging case.', 9900, 'USD', '/products/wireless-earbuds.svg', 'Tech', 35, true, false, 4.2),
  ('Bamboo Charging Dock', 'bamboo-charging-dock', 'TEC-003', 'Three-device bamboo dock with cable management and non-slip base.', 4900, 'USD', '/products/bamboo-charging-dock.svg', 'Tech', 50, true, false, 4.3)
on conflict (slug) do update set
  name = excluded.name, sku = excluded.sku, description = excluded.description,
  price_cents = excluded.price_cents, currency = excluded.currency, image_url = excluded.image_url,
  category = excluded.category, stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active, is_featured = excluded.is_featured, rating = excluded.rating;
