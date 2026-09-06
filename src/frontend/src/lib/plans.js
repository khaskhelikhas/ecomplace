/**
 * Plan definitions, feature gates, and the admin allowlist.
 * Keep ADMIN_EMAILS in sync with firestore.rules isAdmin().
 *
 * Fill the Stripe Payment Link URLs (monthly + annual) once you create them.
 */

export const ADMIN_EMAILS = [
  'safdaraleekhaskheli@gmail.com',
  'saifee.khaskheli@gmail.com',
]

export const isAdmin = (user) =>
  !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

const F = (over = {}) => ({
  csvExport: false,
  affiliateTags: false,
  categoryAlerts: false,
  asinAnalyzer: false,
  bulkAnalysis: false,
  api: false,
  ...over,
})

export const PLANS = {
  free: {
    key: 'free',
    name: 'Free',
    price: 0,
    priceYear: 0,
    limits: { alerts: 3, sourcing: 10, analyzer: 3 },
    features: F(),
    blurb: 'Browse deals, buy/watch/skip signals and the profit calculator.',
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    price: 19,
    priceYear: 190, // ~2 months free
    checkoutUrl: 'https://buy.stripe.com/REPLACE_STARTER_MONTHLY',
    checkoutUrlYear: 'https://buy.stripe.com/REPLACE_STARTER_ANNUAL',
    limits: { alerts: 25, sourcing: Infinity, analyzer: 50 },
    features: F({ csvExport: true, affiliateTags: true, categoryAlerts: true }),
    blurb: 'Unlimited sourcing, CSV export, your own affiliate ids, 25 alerts.',
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    price: 49,
    priceYear: 490,
    checkoutUrl: 'https://buy.stripe.com/REPLACE_PRO_MONTHLY',
    checkoutUrlYear: 'https://buy.stripe.com/REPLACE_PRO_ANNUAL',
    limits: { alerts: Infinity, sourcing: Infinity, analyzer: Infinity },
    features: F({
      csvExport: true,
      affiliateTags: true,
      categoryAlerts: true,
      asinAnalyzer: true,
      bulkAnalysis: true,
    }),
    blurb: 'Everything unlimited + the ASIN analyzer and bulk CSV analysis.',
  },
  agency: {
    key: 'agency',
    name: 'Agency',
    price: 99,
    priceYear: 990,
    checkoutUrl: 'https://buy.stripe.com/REPLACE_AGENCY_MONTHLY',
    checkoutUrlYear: 'https://buy.stripe.com/REPLACE_AGENCY_ANNUAL',
    limits: { alerts: Infinity, sourcing: Infinity, analyzer: Infinity },
    features: F({
      csvExport: true,
      affiliateTags: true,
      categoryAlerts: true,
      asinAnalyzer: true,
      bulkAnalysis: true,
      api: true,
      teamSeats: 5,
    }),
    blurb: 'Pro + API access, 5 team seats, white-label, priority support.',
  },
}

export const PLAN_ORDER = ['free', 'starter', 'pro', 'agency']

// Founding-member offer shown on the pricing page.
export const FOUNDING = {
  active: true,
  copy: 'Founding offer — the first 100 members lock in these prices for life.',
}

export const planOf = (user) => PLANS[user?.subscriptionPlan] || PLANS.free

/** @returns {boolean} */
export const can = (user, feature) => !!planOf(user).features[feature]

/** @returns {number} limit for a countable resource */
export const limitOf = (user, key) => planOf(user).limits[key] ?? 0

export const atLimit = (user, key, currentCount) =>
  currentCount >= limitOf(user, key)
