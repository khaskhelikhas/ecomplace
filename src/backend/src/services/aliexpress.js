/**
 * AliExpress Affiliate (Portals) API — real products, images, prices and
 * YOUR affiliate/promotion links so qualifying orders pay commission.
 *
 * Free to use, but needs credentials from https://portals.aliexpress.com
 * (Affiliate program) → become an affiliate → "API" / open platform app:
 *
 *   ALIEXPRESS_APP_KEY      your app key
 *   ALIEXPRESS_APP_SECRET   your app secret
 *   ALIEXPRESS_TRACKING_ID  a tracking id you create in the portal (e.g. "ecomplace")
 *   ALIEXPRESS_KEYWORDS     optional, comma-separated search terms to pull
 *
 * With no key set, fetchAliExpress() returns [] and the rest of the refresh
 * (DealNews + Slickdeals) runs unchanged.
 */
import crypto from 'node:crypto';

const GATEWAY = 'https://api-sg.aliexpress.com/sync';

export function hasAliExpress() {
  return Boolean(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET);
}

/** TOP/IOP signature: HMAC-SHA256 of the sorted `key+value` concatenation. */
function signParams(params, secret) {
  const base = Object.keys(params)
    .sort()
    .map((k) => k + params[k])
    .join('');
  return crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase();
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function normalise(p, i) {
  const price = num(p.target_sale_price || p.sale_price || p.target_app_sale_price);
  const orig = num(p.target_original_price || p.original_price);
  const disc = orig > price && orig > 0 ? Number((((orig - price) / orig) * 100).toFixed(2)) : 0;
  const rate = num(p.evaluate_rate); // e.g. "92.3%"
  return {
    name: p.product_title,
    category: p.first_level_category_name || p.second_level_category_name || 'AliExpress',
    source: 'aliexpress',
    source_url: p.promotion_link || p.product_detail_url,
    current_price: price,
    previous_price: orig || price,
    margin_percentage: disc,
    rating: rate ? Math.max(0, Math.min(5, Number((rate / 20).toFixed(1)))) : 0,
    reviews_count: num(p.lastest_volume || p.volume),
    best_sellers_rank: i + 1,
    fba_fee: 0,
    shipping_cost: 0,
    image_url: p.product_main_image_url || p.image_url || null,
    expires_at: null,
    asin: null,
    sku: `aliexpress-${p.product_id || i}`,
  };
}

/**
 * @param {{ keywords?: string, categoryIds?: string|number, pageSize?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchAliExpress({ keywords = '', categoryIds = '', pageSize = 20 } = {}) {
  if (!hasAliExpress()) return [];

  const params = {
    app_key: process.env.ALIEXPRESS_APP_KEY,
    method: 'aliexpress.affiliate.hotproduct.query',
    sign_method: 'sha256',
    timestamp: String(Date.now()),
    target_currency: 'USD',
    target_language: 'EN',
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID || 'ecomplace',
    ship_to_country: 'US',
    page_size: String(Math.min(50, Math.max(1, pageSize))),
    page_no: '1',
  };
  if (keywords) params.keywords = keywords;
  if (categoryIds) params.category_ids = String(categoryIds);
  params.sign = signParams(params, process.env.ALIEXPRESS_APP_SECRET);

  const res = await fetch(`${GATEWAY}?${new URLSearchParams(params).toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`AliExpress HTTP ${res.status}`);
  const json = await res.json();

  if (json?.error_response) {
    throw new Error(
      `AliExpress API: ${json.error_response.code} ${json.error_response.msg || ''}`.trim()
    );
  }

  // The products array is nested a few levels deep and the exact shape has
  // changed across API versions — dig for it defensively.
  const resp =
    json?.aliexpress_affiliate_hotproduct_query_response ||
    json?.aliexpress_affiliate_product_query_response ||
    json?.resp_result ||
    json;
  const result = resp?.resp_result?.result || resp?.result || resp || {};
  let products = result?.products?.product || result?.products || result?.product || [];
  if (!Array.isArray(products)) products = products ? [products] : [];

  return products.map(normalise).filter((p) => p.name && p.current_price > 0);
}
