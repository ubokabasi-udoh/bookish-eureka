/**
 * Single source of truth for the demo catalog.
 * - database/seed/seed.sql is generated from this (npm run db:seed:generate) and checked by a test.
 * - The in-memory driver loads this directly.
 */
export interface SeedProduct {
  slug: string;
  name: string;
  sku: string;
  category: string;
  priceCents: number;
  stockQuantity: number;
  isFeatured: boolean;
  rating: number;
  description: string;
}

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  { slug: "merino-crew-sweater", name: "Merino Crew Sweater", sku: "APP-001", category: "Apparel", priceCents: 12900, stockQuantity: 24, isFeatured: true, rating: 4.8, description: "Fine-gauge merino wool crewneck with a soft hand and a relaxed fit. Temperature-regulating and machine washable." },
  { slug: "organic-cotton-tee", name: "Organic Cotton Tee", sku: "APP-002", category: "Apparel", priceCents: 3400, stockQuantity: 80, isFeatured: false, rating: 4.5, description: "Heavyweight organic cotton tee, garment-dyed for a lived-in feel from day one." },
  { slug: "waxed-canvas-jacket", name: "Waxed Canvas Jacket", sku: "APP-003", category: "Apparel", priceCents: 18900, stockQuantity: 9, isFeatured: true, rating: 4.7, description: "Water-resistant waxed canvas field jacket with corduroy collar and four utility pockets." },
  { slug: "linen-overshirt", name: "Linen Overshirt", sku: "APP-004", category: "Apparel", priceCents: 9800, stockQuantity: 15, isFeatured: false, rating: 4.4, description: "Breathable European linen overshirt, cut long enough to wear open over a tee." },
  { slug: "ceramic-pour-over-set", name: "Ceramic Pour-Over Set", sku: "HOM-001", category: "Home", priceCents: 5600, stockQuantity: 32, isFeatured: true, rating: 4.9, description: "Hand-glazed ceramic dripper and carafe set for a slow, precise morning cup." },
  { slug: "stoneware-dinner-plates", name: "Stoneware Dinner Plates (Set of 4)", sku: "HOM-002", category: "Home", priceCents: 7200, stockQuantity: 18, isFeatured: false, rating: 4.6, description: "Four reactive-glaze stoneware plates. Dishwasher and microwave safe." },
  { slug: "wool-throw-blanket", name: "Wool Throw Blanket", sku: "HOM-003", category: "Home", priceCents: 11000, stockQuantity: 3, isFeatured: true, rating: 4.8, description: "Oversized lambswool throw woven in small batches. Only a few left this season." },
  { slug: "soy-wax-candle", name: "Soy Wax Candle", sku: "HOM-004", category: "Home", priceCents: 2800, stockQuantity: 120, isFeatured: false, rating: 4.3, description: "Cedar and bergamot hand-poured soy candle with a 50-hour burn time." },
  { slug: "walnut-desk-organizer", name: "Walnut Desk Organizer", sku: "HOM-005", category: "Home", priceCents: 6400, stockQuantity: 0, isFeatured: false, rating: 4.5, description: "Solid walnut organizer with pen tray and phone stand. Currently out of stock." },
  { slug: "leather-card-wallet", name: "Leather Card Wallet", sku: "ACC-001", category: "Accessories", priceCents: 5800, stockQuantity: 45, isFeatured: true, rating: 4.7, description: "Vegetable-tanned leather slim wallet that develops a patina with use." },
  { slug: "canvas-weekender-bag", name: "Canvas Weekender Bag", sku: "ACC-002", category: "Accessories", priceCents: 14500, stockQuantity: 12, isFeatured: false, rating: 4.6, description: "Durable canvas duffel with leather handles and a padded shoulder strap." },
  { slug: "stainless-water-bottle", name: "Stainless Water Bottle", sku: "ACC-003", category: "Accessories", priceCents: 3600, stockQuantity: 70, isFeatured: false, rating: 4.4, description: "Double-wall insulated bottle that keeps drinks cold 24 hours or hot 12." },
  { slug: "polarized-sunglasses", name: "Polarized Sunglasses", sku: "ACC-004", category: "Accessories", priceCents: 8900, stockQuantity: 28, isFeatured: false, rating: 4.5, description: "Acetate frames with polarized mineral lenses and full UV400 protection." },
  { slug: "mechanical-keyboard", name: "Compact Mechanical Keyboard", sku: "TEC-001", category: "Tech", priceCents: 13900, stockQuantity: 20, isFeatured: true, rating: 4.8, description: "75% layout hot-swappable keyboard with PBT keycaps and wireless or USB-C." },
  { slug: "wireless-earbuds", name: "Wireless Earbuds", sku: "TEC-002", category: "Tech", priceCents: 9900, stockQuantity: 35, isFeatured: false, rating: 4.2, description: "Active noise cancelling earbuds with 8 hours of playback and a wireless charging case." },
  { slug: "bamboo-charging-dock", name: "Bamboo Charging Dock", sku: "TEC-003", category: "Tech", priceCents: 4900, stockQuantity: 50, isFeatured: false, rating: 4.3, description: "Three-device bamboo dock with cable management and non-slip base." },
];

export const seedImageUrl = (slug: string) => `/products/${slug}.svg`;

const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;

export function renderSeedSql(products: readonly SeedProduct[] = SEED_PRODUCTS): string {
  const rows = products
    .map(
      (p) =>
        `  (${sqlText(p.name)}, ${sqlText(p.slug)}, ${sqlText(p.sku)}, ${sqlText(p.description)}, ${p.priceCents}, 'USD', ${sqlText(seedImageUrl(p.slug))}, ${sqlText(p.category)}, ${p.stockQuantity}, true, ${p.isFeatured}, ${p.rating})`,
    )
    .join(",\n");
  const categories = new Set(products.map((p) => p.category)).size;
  return `-- seed.sql — realistic demo catalog (${products.length} products, ${categories} categories).
-- GENERATED from src/integrations/database/seed-data.ts — run \`npm run db:seed:generate\`; do not edit by hand.
-- Idempotent: safe to re-run. Images are local files served from /public/products.
insert into products
  (name, slug, sku, description, price_cents, currency, image_url, category, stock_quantity, is_active, is_featured, rating)
values
${rows}
on conflict (slug) do update set
  name = excluded.name, sku = excluded.sku, description = excluded.description,
  price_cents = excluded.price_cents, currency = excluded.currency, image_url = excluded.image_url,
  category = excluded.category, stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active, is_featured = excluded.is_featured, rating = excluded.rating;
`;
}
