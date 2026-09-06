# Pricing & billing — how it works

## The plans

Defined in `src/frontend/src/lib/plans.js` (change prices / limits there).

| Plan | Monthly | Annual | Alerts | Sourcing | CSV | Affiliate ids | ASIN analyzer | Bulk CSV | API |
|---|---|---|---|---|---|---|---|---|---|
| **Free** | $0 | — | 3 | 10 | — | — | — | — | — |
| **Starter** | $19 | $190 | 25 | ∞ | ✓ | ✓ | — | — | — |
| **Pro** | $49 | $490 | ∞ | ∞ | ✓ | ✓ | ✓ | ✓ | — |
| **Agency** | $99 | $990 | ∞ | ∞ | ✓ | ✓ | ✓ | ✓ | ✓ (5 seats, white-label) |

Annual ≈ 2 months free. A **founding offer** banner ("first 100 members lock
in these prices") shows on `/upgrade` — toggle with `FOUNDING.active` in
`plans.js`.

The user's plan lives in Firestore at `users/{uid}.subscriptionPlan`
(`"free" | "starter" | "pro" | "agency"`). The frontend reads it via
`authStore` and gates features with `can()` / `limitOf()` from `plans.js`.

### Comparable tools (why these prices)

Keepa €19 · SellerAmp $20 · RevSeller ~$12 · BuyBotPro ~$35 · Jungle Scout
$49 · Helium 10 $39-99 · Tactical Arbitrage $59-89. Resellers pay because one
good flip covers months of fee.

---

## Phase 0 — manual requests (LIVE now, $0, no processor)

Every paid plan's button opens a request panel: the user picks a payment
method (Wise / Payoneer / JazzCash / Easypaisa / crypto — edit these in
`plans.js` `PAYMENT.methods`), submits, pays offline, and emails the receipt.
You see it in **/admin → Pending upgrade requests** and hit **Approve**,
which sets their plan and resolves the request. Good for the first customers.

## Phase 1 — hosted checkout (recommended next)

Stripe is not available to Pakistani businesses. Use a **Merchant of Record**
that is and that pays out to Pakistan (via Payoneer / wire):

- **Lemon Squeezy** (now part of Stripe) — simplest, supports Pakistan payouts
- **Paddle** — handles global cards + tax, Payoneer/wire payouts

Create the products/prices there, get the checkout URLs, put them in
`plans.js` (`checkoutUrl` / `checkoutUrlYear`) and set
`PAYMENT.hostedCheckout = true`. Their webhook then flips the plan
automatically (same idea as the Stripe extension below).

## Phase 1b — Stripe (only if you can get a Stripe account)

1. **Create Stripe Payment Links** (Stripe dashboard → Payment links) — 6 links,
   a monthly + an annual for each paid plan, and paste them into `plans.js`:
   - `PLANS.starter.checkoutUrl` / `.checkoutUrlYear`  ($19 / $190)
   - `PLANS.pro.checkoutUrl` / `.checkoutUrlYear`      ($49 / $490)
   - `PLANS.agency.checkoutUrl` / `.checkoutUrlYear`   ($99 / $990)
   - quantity adjust off; collect email on
2. The **/upgrade** page sends the user to that link with
   `?client_reference_id=<uid>&prefilled_email=<email>` so you can see who paid.
3. When Stripe emails you a successful payment, open **/admin**, find the
   user, set their plan to **Pro** / **Business**. Done.
4. To downgrade on cancellation, set them back to **Free**.

This is fine for the first ~20–30 paying users.

---

## Phase 2 — automatic

You need something that receives Stripe webhooks and writes the plan back
to Firestore. Two options.

### Option A — Firebase "Run Payments with Stripe" extension (recommended)

- Requires the **Blaze** plan (pay-as-you-go; realistically ~$0/mo at low volume).
- Install: `firebase ext:install stripe/firestore-stripe-payments`
- It creates `customers/{uid}` + `customers/{uid}/subscriptions/*`, handles the
  Checkout session and all webhooks, and keeps subscription status in sync.
- Then change `plans.js` / `authStore` to read the plan from
  `customers/{uid}/subscriptions` (active price → plan) instead of
  `users/{uid}.subscriptionPlan`.
- Product/price ids and the webhook secret are configured during install.

### Option B — a tiny webhook on a free host

- Deploy a single function to **Cloudflare Workers** / **Vercel** / **Deno Deploy**
  (all have free tiers).
- It: verifies the Stripe signature, and on
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted` → uses a Firebase **service account** to
  `set users/{uid}.subscriptionPlan` (uid comes from `client_reference_id`).
- Point the Stripe webhook endpoint at that URL.
- No Blaze plan needed.

---

## Enforcement

Frontend gates (already wired):
- alert creation blocked past `limitOf(user,'alerts')`
- sourcing add blocked past `limitOf(user,'sourcing')`
- CSV export button → `/upgrade` on Free
- affiliate id fields disabled on Free; outbound links only carry the user's
  tag when `can(user,'affiliateTags')`

Firestore rules already let a user edit only their own profile and an admin
edit anyone — so a user cannot self-upgrade by writing `subscriptionPlan`
from the client is **not** blocked yet. Before charging money, tighten
`users/{uid}` update rules to reject client writes to `subscriptionPlan`
(allow it only from the admin allowlist or the extension's service account).

---

## Admin portal

`/admin` (visible only to emails in `ADMIN_EMAILS` / `isAdmin()` in the rules):
- total users, split by plan, rough MRR
- searchable user list with an inline plan dropdown
- last refresh status + snapshot freshness
