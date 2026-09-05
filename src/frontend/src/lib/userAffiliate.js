/**
 * Rewrite an outbound product URL with the CURRENT USER's own affiliate ids
 * so they earn the commission on deals they open or share.
 *
 * profile: { affiliateAmazonTag, affiliateEbayCampaign, affiliateGenericQs }
 */
export function withUserAffiliate(url, source = '', profile = {}) {
  if (!url) return url
  const s = (source || '').toLowerCase()

  try {
    const u = new URL(url)

    if (s.startsWith('amazon') && profile.affiliateAmazonTag) {
      u.searchParams.set('tag', profile.affiliateAmazonTag)
      return u.toString()
    }
    if (s === 'ebay' && profile.affiliateEbayCampaign) {
      u.searchParams.set('mkevt', '1')
      u.searchParams.set('mkcid', '1')
      u.searchParams.set('campid', profile.affiliateEbayCampaign)
      u.searchParams.set('toolid', '10001')
      return u.toString()
    }
    if (profile.affiliateGenericQs) {
      const qs = profile.affiliateGenericQs.replace(/^[?&]/, '')
      return url + (url.includes('?') ? '&' : '?') + qs
    }
    return url
  } catch {
    return url
  }
}

export const hasUserAffiliate = (p = {}) =>
  Boolean(p.affiliateAmazonTag || p.affiliateEbayCampaign || p.affiliateGenericQs)
