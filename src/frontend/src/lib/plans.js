/**
 * Plan definitions, feature gates, and the admin allowlist.
 * Keep ADMIN_EMAILS in sync with firestore.rules isAdmin().
 */

export const ADMIN_EMAILS = [
  'safdaraleekhaskheli@gmail.com',
  'saifee.khaskheli@gmail.com',
]

export const isAdmin = (user) =>
  !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    limits: { alerts: 3, sourcing: 10 },
    features: {
      csvExport: false,
      affiliateTags: false,
      categoryAlerts: false,
    },
    blurb: 'Browse deals, signals and the profit calculator.',
  },
  pro: {
    name: 'Pro',
    price: 9,
    priceLabel: '$9 / month',
    // Fill in from Stripe -> Payment links
    checkoutUrl: 'https://buy.stripe.com/REPLACE_PRO_LINK',
    limits: { alerts: Infinity, sourcing: Infinity },
    features: {
      csvExport: true,
      affiliateTags: true,
      categoryAlerts: true,
    },
    blurb: 'Unlimited alerts + sourcing, CSV export, your own affiliate ids.',
  },
  business: {
    name: 'Business',
    price: 29,
    priceLabel: '$29 / month',
    checkoutUrl: 'https://buy.stripe.com/REPLACE_BUSINESS_LINK',
    limits: { alerts: Infinity, sourcing: Infinity },
    features: {
      csvExport: true,
      affiliateTags: true,
      categoryAlerts: true,
      api: true,
      teamSeats: 5,
    },
    blurb: 'Everything in Pro + API access, 5 seats, priority support.',
  },
}

export const planOf = (user) => PLANS[user?.subscriptionPlan] || PLANS.free

/** @returns {boolean} */
export const can = (user, feature) => !!planOf(user).features[feature]

/** @returns {number} limit for a countable resource ('alerts' | 'sourcing') */
export const limitOf = (user, key) => planOf(user).limits[key] ?? 0

export const atLimit = (user, key, currentCount) =>
  currentCount >= limitOf(user, key)
