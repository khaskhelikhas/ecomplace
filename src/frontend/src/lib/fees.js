/**
 * Rough Amazon referral-fee % by category (US, 2024-ish).
 * These are the seller-side referral fees, not FBA fulfilment (that goes in
 * the "shipping / unit" field of the calculator).
 */
const TABLE = [
  [/electronic|computer|camera|phone|tablet|tv|monitor|console|audio|headphone|speaker/i, 8],
  [/grocery|food|beverage|coffee|snack/i, 8],
  [/video game|console/i, 8],
  [/book|magazine|dvd|music|media/i, 15],
  [/clothing|apparel|shoe|footwear|activewear|jersey|hat|accessor|watch|jewelry|jewellery/i, 17],
  [/beauty|fragrance|cosmetic|skincare|health|personal care/i, 12],
  [/tool|hardware|drill|garden|lawn|home improvement|automotive|tire/i, 15],
  [/home|kitchen|furniture|bed|bath|mattress|decor|appliance/i, 15],
  [/sport|fitness|outdoor|bike|bicycl|exercise|pickleball|golf/i, 15],
  [/toy|game|hobby|lego|plush|puzzle/i, 15],
  [/baby|diaper|stroller/i, 15],
  [/pet|dog|cat/i, 15],
]

/** @returns {number} estimated referral fee % for a loose category string */
export function categoryFeePct(category = '') {
  for (const [re, pct] of TABLE) if (re.test(category)) return pct
  return 15 // Amazon's catch-all
}
