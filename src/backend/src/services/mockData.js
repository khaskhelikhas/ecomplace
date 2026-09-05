/**
 * Mock data generator - used when real API keys are not configured.
 * Produces realistic-looking products so the dashboard is populated
 * during development and demos.
 */

const PRODUCT_TEMPLATES = [
  { name: 'Wireless Bluetooth Earbuds with Charging Case', category: 'Electronics', basePrice: 24.99 },
  { name: 'Stainless Steel Insulated Water Bottle 32oz', category: 'Home & Kitchen', basePrice: 18.5 },
  { name: 'LED Desk Lamp with USB Charging Port', category: 'Office', basePrice: 32.0 },
  { name: 'Silicone Baking Mat Set (3-Pack)', category: 'Home & Kitchen', basePrice: 14.99 },
  { name: 'Adjustable Laptop Stand for Desk', category: 'Office', basePrice: 39.95 },
  { name: 'Resistance Bands Set with Handles', category: 'Sports', basePrice: 21.99 },
  { name: 'Ceramic Non-Stick Frying Pan 10-inch', category: 'Home & Kitchen', basePrice: 27.49 },
  { name: 'Portable Bluetooth Speaker Waterproof', category: 'Electronics', basePrice: 45.0 },
  { name: 'Memory Foam Pillow Cervical Support', category: 'Home & Kitchen', basePrice: 34.99 },
  { name: 'Stainless Steel Kitchen Knife Set (5-Piece)', category: 'Home & Kitchen', basePrice: 49.99 },
  { name: 'USB-C to HDMI Adapter 4K', category: 'Electronics', basePrice: 15.99 },
  { name: 'Yoga Mat Non-Slip 6mm Thick', category: 'Sports', basePrice: 25.99 },
  { name: 'Electric Milk Frother Handheld', category: 'Home & Kitchen', basePrice: 12.99 },
  { name: 'Car Phone Mount Dashboard Holder', category: 'Automotive', basePrice: 16.49 },
  { name: 'Reusable Grocery Bags Foldable (5-Pack)', category: 'Home & Kitchen', basePrice: 19.99 },
  { name: 'Wireless Charging Pad 15W Fast Charge', category: 'Electronics', basePrice: 22.0 },
  { name: 'Stainless Steel Measuring Cups and Spoons', category: 'Home & Kitchen', basePrice: 17.99 },
  { name: 'Foam Roller for Muscle Recovery', category: 'Sports', basePrice: 28.99 },
  { name: 'Desk Organizer with Drawer Mesh', category: 'Office', basePrice: 23.5 },
  { name: 'Digital Kitchen Food Scale', category: 'Home & Kitchen', basePrice: 13.99 },
];

const SOURCES = ['amazon-us', 'walmart-us', 'aliexpress'];

const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max + 1));
const pick = (arr) => arr[randomInt(0, arr.length - 1)];

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Generate a batch of mock products with slight price drift each cycle
 * so price history and "price drop" behaviour is visible over time.
 */
export const generateMockProducts = (count = 40) => {
  const products = [];

  for (let i = 0; i < count; i++) {
    const template = PRODUCT_TEMPLATES[i % PRODUCT_TEMPLATES.length];
    // Stable source per slot so repeated cycles update the same rows
    const source = SOURCES[i % SOURCES.length];

    // Price drifts +/- 12% around the base price each cycle
    const drift = random(0.88, 1.12);
    const currentPrice = Number((template.basePrice * drift).toFixed(2));
    const previousPrice = Number((template.basePrice * random(0.95, 1.15)).toFixed(2));

    const isAmazon = source === 'amazon-us';
    const isAli = source === 'aliexpress';

    // Deterministic identifiers so the 20-minute cycle refreshes prices
    // on existing products instead of inserting duplicates.
    const stableId = String(1000 + i);

    products.push({
      asin: isAmazon ? `B0MOCK${stableId}` : null,
      sku: !isAmazon ? `SKU-MOCK-${stableId}` : null,
      name: template.name,
      category: template.category,
      source,
      source_url: isAmazon
        ? `https://www.amazon.com/dp/B0MOCK${stableId}`
        : isAli
          ? `https://www.aliexpress.com/item/${stableId}000.html`
          : `https://www.walmart.com/ip/${slugify(template.name)}/${stableId}000`,
      current_price: currentPrice,
      previous_price: previousPrice,
      rating: Number(random(3.4, 4.9).toFixed(1)),
      reviews_count: randomInt(12, 8500),
      best_sellers_rank: randomInt(1, 500),
      // AliExpress is the cheap source, marketplaces are the sell side
      fba_fee: isAmazon ? Number(random(2.5, 6.5).toFixed(2)) : 0,
      shipping_cost: isAli ? Number(random(0, 3.5).toFixed(2)) : Number(random(0, 5).toFixed(2)),
      image_url: `https://picsum.photos/seed/${slugify(template.name)}-${i}/300/300`,
    });
  }

  return products;
};
