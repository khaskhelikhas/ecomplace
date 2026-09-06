/**
 * Plan definitions, feature gates, and the admin allowlist.
 * Keep ADMIN_EMAILS in sync with firestore.rules isAdmin().
 *
 * Fill the Stripe Payment Link URLs (monthly + annual) once you create them.
 */

// Admin status comes from a signed Firebase custom claim on the ID token
// (see src/backend `npm run set-admin`). No admin identity is embedded here.
export const isAdmin = (user) => !!user?.isAdmin

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
    // Lemon Squeezy checkout URLs (Merchant of Record — takes global cards,
    // pays out to Pakistan). Paste after you create the products.
    checkoutUrl: 'https://YOURSTORE.lemonsqueezy.com/buy/REPLACE-STARTER-MONTHLY',
    checkoutUrlYear: 'https://YOURSTORE.lemonsqueezy.com/buy/REPLACE-STARTER-ANNUAL',
    limits: { alerts: 25, sourcing: Infinity, analyzer: 50 },
    features: F({ csvExport: true, affiliateTags: true, categoryAlerts: true }),
    blurb: 'Unlimited sourcing, CSV export, your own affiliate ids, 25 alerts.',
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    price: 49,
    priceYear: 490,
    checkoutUrl: 'https://YOURSTORE.lemonsqueezy.com/buy/REPLACE-PRO-MONTHLY',
    checkoutUrlYear: 'https://YOURSTORE.lemonsqueezy.com/buy/REPLACE-PRO-ANNUAL',
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
    checkoutUrl: 'https://YOURSTORE.lemonsqueezy.com/buy/REPLACE-AGENCY-MONTHLY',
    checkoutUrlYear: 'https://YOURSTORE.lemonsqueezy.com/buy/REPLACE-AGENCY-ANNUAL',
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

/**
 * Map a Lemon Squeezy variant id -> our plan key. Fill after you create
 * the products; used by the payments webhook worker.
 */
export const LS_VARIANT_TO_PLAN = {
  // '123456': 'starter',
  // '123457': 'starter',   // annual
  // '123458': 'pro',
  // '123459': 'pro',
  // '123460': 'agency',
  // '123461': 'agency',
}

export const PLAN_ORDER = ['free', 'starter', 'pro', 'agency']

// Founding-member offer shown on the pricing page.
export const FOUNDING = {
  active: true,
  copy: 'Founding offer — the first 100 members lock in these prices for life.',
}

/**
 * How a user pays. If a plan has a real checkout URL it is used; otherwise
 * the user submits a manual-payment request that the admin approves.
 * Edit the methods for your accounts.
 */
export const PAYMENT = {
  // Set true once you have a hosted checkout (Lemon Squeezy / Paddle / Stripe)
  hostedCheckout: false,
  methods: [
    { label: 'Wise / bank transfer', detail: 'khaskhelikhas013@gmail.com — request details after you submit' },
    { label: 'Payoneer', detail: 'khaskhelikhas013@gmail.com' },
    { label: 'JazzCash / Easypaisa', detail: 'shared after you submit a request' },
    { label: 'Crypto (USDT TRC-20)', detail: 'address shared after you submit a request' },
  ],
  note:
    'Submit the request below, pay by any method, then reply to our email with the receipt. ' +
    'Your plan is activated within 24 hours (usually much faster).',
}

export const planOf = (user) => PLANS[user?.subscriptionPlan] || PLANS.free

/** @returns {boolean} */
export const can = (user, feature) => !!planOf(user).features[feature]

/** @returns {number} limit for a countable resource */
export const limitOf = (user, key) => planOf(user).limits[key] ?? 0

export const atLimit = (user, key, currentCount) =>
  currentCount >= limitOf(user, key)

/** Name of the cheapest plan that includes a feature — for accurate upsell labels. */
export const minPlanFor = (feature) => {
  for (const k of PLAN_ORDER) if (PLANS[k].features[feature]) return PLANS[k].name
  return 'Pro'
}
