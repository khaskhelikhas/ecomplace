/**
 * Free, key-less real deal data.
 *
 * DealNews publishes a public RSS feed of current, hand-vetted deals across
 * major US retailers (Amazon, Walmart, Best Buy, eBay, Home Depot, AliExpress,
 * ...). No API key, no approval, updates continuously.
 *
 * Feed: https://www.dealnews.com/rss/todays-edition/
 */

import { fetchAliExpress, hasAliExpress } from './aliexpress.js';

const FEED_URL = 'https://www.dealnews.com/rss/todays-edition/';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const decode = (s = '') =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : null;
};

const slugRetailer = (r = '') => {
  const k = r.toLowerCase().trim();
  if (k.includes('amazon')) return 'amazon-us';
  if (k.includes('walmart')) return 'walmart-us';
  if (k.includes('best buy') || k.includes('bestbuy')) return 'best-buy';
  if (k.includes('ebay')) return 'ebay';
  if (k.includes('aliexpress')) return 'aliexpress';
  if (k.includes('home depot')) return 'home-depot';
  if (k.includes('target')) return 'target';
  return k.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'other';
};

/**
 * Pull a "$12.34" style price out of free text.
 */
const parsePrice = (text = '') => {
  const m = text.match(/\$\s?([0-9]{1,6}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
};

/**
 * Try to find "list price $X" / "$X off" / "Save $X" in the description
 * so we can compute a real discount percentage.
 */
const parseListPrice = (desc = '', current = 0) => {
  const list =
    desc.match(/list(?:ed)?\s+(?:price\s+)?(?:of\s+)?\$\s?([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    desc.match(/(?:was|orig(?:inally)?|reg(?:ularly)?)\.?\s+\$\s?([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (list) return Number(list[1].replace(/,/g, ''));

  const save =
    desc.match(/sav(?:e|ings?)\s+(?:of\s+)?\$\s?([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    desc.match(/\$\s?([0-9,]+(?:\.[0-9]{1,2})?)\s+off/i);
  if (save && current) return current + Number(save[1].replace(/,/g, ''));

  return null;
};

/** Ask the DealNews CDN for a larger render than the ~125px feed thumbnail. */
const upsizeImage = (url = '') => {
  if (!url) return url
  if (url.includes('d.dlnws.com')) {
    return url.split('?')[0] + '?w=500'
  }
  return url
}

const cleanName = (title = '') =>
  title
    .replace(/\s+for\s+\$[0-9,.]+.*$/i, '')
    .replace(/\s+(?:from|under)\s+\$[0-9,.]+.*$/i, '')
    .replace(/:\s*$/,'')
    .trim();

/**
 * Store-wide sale roundups ("Best Buy Labor Day Sale: Up to 70% off") are not
 * single products - drop them so the list stays actionable.
 */
const isRoundup = (name = '') =>
  /\bsale:\s|\bdeals?\s+at\s|\bspecials?\s+(for|at)\s|\bup\s+to\s+[$\d]|\bclearance\b|\bgift\s+guide\b|%\s+off\b/i.test(
    name
  );

/** Basic sanity on a scraped price. */
const sanePrice = (n) => typeof n === 'number' && n > 0 && n < 100000;

const SLICKDEALS_URL =
  'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1';

/**
 * Slickdeals frontpage RSS - community-voted deals. No key.
 */
export async function fetchSlickdeals() {
  // Slickdeals 403s intermittently - one quick retry.
  let res = await fetch(SLICKDEALS_URL, { headers: { 'User-Agent': UA } });
  if (res.status === 403) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(SLICKDEALS_URL, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml' } });
  }
  if (!res.ok) throw new Error(`Slickdeals feed HTTP ${res.status}`);
  const xml = await res.text();

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const out = [];

  items.forEach((item, i) => {
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    if (!title || !link) return;

    const desc = tag(item, 'description') || '';
    const encoded = tag(item, 'content:encoded') || '';

    const current = parsePrice(title) ?? parsePrice(desc);
    if (!sanePrice(current)) return;

    const name = cleanName(title);
    if (isRoundup(name)) return;

    // "... via Amazon [amazon.com] has ..." -> retailer
    const viaMatch = desc.match(/\bvia\s+([A-Za-z0-9 .&'-]+?)\s*(?:\[|has\b)/i);
    const retailer = viaMatch ? viaMatch[1].trim() : 'Slickdeals';

    const list = parseListPrice(desc + ' ' + encoded, current);
    const discountPct =
      list && list > current ? Number((((list - current) / list) * 100).toFixed(2)) : 0;

    const imgMatch = encoded.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
    const thumb = (encoded.match(/Thumb Score:\s*\+?(-?\d+)/i) || [])[1];
    const dealId = link.match(/\/f\/(\d+)/)?.[1] || i;

    out.push({
      name,
      category: 'Deals',
      source: slugRetailer(retailer),
      source_url: link,
      current_price: current,
      previous_price: list || current,
      margin_percentage: discountPct,
      // community thumbs as a rough popularity proxy (0-5 scale)
      rating: thumb ? Math.max(0, Math.min(5, Number((Number(thumb) / 20).toFixed(1)))) : 0,
      reviews_count: thumb ? Math.abs(Number(thumb)) : 0,
      best_sellers_rank: i + 1,
      fba_fee: 0,
      shipping_cost: 0,
      image_url: imgMatch ? upsizeImage(imgMatch[1]) : null,
      expires_at: null,
      asin: null,
      sku: `slickdeals-${dealId}`,
    });
  });

  return out;
}

/**
 * Fetch and normalise the DealNews feed into product-shaped objects that
 * match the fields the app/Firestore expect.
 */
export async function fetchDealNews() {
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`DealNews feed HTTP ${res.status}`);
  const xml = await res.text();

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const out = [];

  items.forEach((item, i) => {
    const title = tag(item, 'title');
    const link = tag(item, 'link');
    if (!title || !link) return;

    const descRaw = tag(item, 'description') || '';
    const retailer = tag(item, 'dealnews:retailer') || 'DealNews';
    const category = tag(item, 'dealnews:category') || 'Deals';
    const expires = tag(item, 'dealnews:expires') || null;

    const current = parsePrice(title) ?? parsePrice(descRaw);
    if (!sanePrice(current)) return; // skip coupon-only / no-price / junk

    const name = cleanName(title);
    if (isRoundup(name)) return;

    const list = parseListPrice(descRaw, current);
    const discountPct =
      list && list > current ? Number((((list - current) / list) * 100).toFixed(2)) : 0;

    const imgMatch = descRaw.match(/<img[^>]+src=['"]([^'"]+)['"]/i);

    out.push({
      name,
      category,
      source: slugRetailer(retailer),
      source_url: link,
      current_price: current,
      previous_price: list || current,
      // reuse the "margin" field to carry the deal's discount %
      margin_percentage: discountPct,
      rating: 0,
      reviews_count: 0,
      best_sellers_rank: i + 1,
      fba_fee: 0,
      shipping_cost: 0,
      image_url: imgMatch ? upsizeImage(imgMatch[1]) : null,
      expires_at: expires,
      asin: null,
      sku: `dealnews-${link.match(/(\d+)\.html/)?.[1] || i}`,
    });
  });

  return out;
}

/**
 * All feeds combined, de-duplicated by name+price.
 *
 * DealNews + Slickdeals are always on (key-less). AliExpress is added only
 * when ALIEXPRESS_APP_KEY / _SECRET are set — see services/aliexpress.js.
 */
export async function fetchAllDeals() {
  const jobs = [fetchDealNews(), fetchSlickdeals()];

  if (hasAliExpress()) {
    const terms = (
      process.env.ALIEXPRESS_KEYWORDS ||
      'wireless earbuds,phone case,kitchen gadget,led strip light,smart watch,car accessories'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    for (const t of terms) jobs.push(fetchAliExpress({ keywords: t, pageSize: 10 }));
  }

  const results = await Promise.allSettled(jobs);
  const merged = [];
  const seen = new Set();

  for (const r of results) {
    if (r.status !== 'fulfilled') {
      console.warn('Deal feed failed:', r.reason?.message || r.reason);
      continue;
    }
    for (const d of r.value) {
      const key = `${d.name.toLowerCase().slice(0, 40)}|${d.current_price}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(d);
    }
  }
  return merged;
}
