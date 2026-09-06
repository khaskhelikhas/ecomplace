/**
 * Wrap outbound product URLs with affiliate tracking.
 *
 * Set only the programs you have joined - everything else passes through
 * untouched, so the site works with zero config and starts earning the
 * moment you add an ID.
 *
 *   AMAZON_ASSOC_TAG        e.g. "mystore-20"   (Amazon Associates)
 *   EBAY_CAMPAIGN_ID        e.g. "5339000000"   (eBay Partner Network)
 *   WALMART_AFFILIATE_QS    e.g. "veh=aff&sourceid=imp_000&u1=ecomplace"
 *   ALIEXPRESS_AFFILIATE_QS e.g. "aff_fcid=...&aff_platform=portals-tool"
 *   GENERIC_AFFILIATE_QS    appended to any other retailer's URL
 */

const addParams = (rawUrl, params) => {
  try {
    const u = new URL(rawUrl);
    for (const [k, v] of Object.entries(params)) {
      if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
};

const appendQs = (rawUrl, qs) => {
  if (!qs) return rawUrl;
  return rawUrl + (rawUrl.includes('?') ? '&' : '?') + qs.replace(/^[?&]/, '');
};

/**
 * @param {string} url     original product URL
 * @param {string} source  retailer slug (amazon-us, ebay, walmart-us, ...)
 */
export function affiliateUrl(url, source = '') {
  if (!url) return url;
  const s = source.toLowerCase();

  if (s.startsWith('amazon') && process.env.AMAZON_ASSOC_TAG) {
    return addParams(url, { tag: process.env.AMAZON_ASSOC_TAG });
  }
  if (s === 'ebay' && process.env.EBAY_CAMPAIGN_ID) {
    return addParams(url, {
      mkevt: '1',
      mkcid: '1',
      campid: process.env.EBAY_CAMPAIGN_ID,
      toolid: '10001',
    });
  }
  if (s.startsWith('walmart') && process.env.WALMART_AFFILIATE_QS) {
    return appendQs(url, process.env.WALMART_AFFILIATE_QS);
  }
  if (s === 'aliexpress') {
    // The Affiliate API already returns a tracked promotion link — don't
    // double-tag it. Only wrap a plain product URL.
    const alreadyTracked =
      /s\.click\.aliexpress\.com/i.test(url) || /[?&]aff_(fcid|platform|trace_key)=/i.test(url);
    if (alreadyTracked) return url;
    if (process.env.ALIEXPRESS_AFFILIATE_QS) {
      return appendQs(url, process.env.ALIEXPRESS_AFFILIATE_QS);
    }
    return url;
  }
  if (process.env.GENERIC_AFFILIATE_QS) {
    return appendQs(url, process.env.GENERIC_AFFILIATE_QS);
  }
  return url;
}
