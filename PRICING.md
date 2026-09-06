# Pricing & billing — how it works

## The plans

Defined in `src/frontend/src/lib/plans.js` (change prices / limits there).

| Plan | Price | Alerts | Sourcing | CSV export | Own affiliate ids | API |
|---|---|---|---|---|---|---|
| **Free** | $0 | 3 | 10 | — | — | — |
| **Pro** | $9 / mo | ∞ | ∞ | ✓ | ✓ | — |
| **Business** | $29 / mo | ∞ | ∞ | ✓ | ✓ | ✓ (5 seats) |

The user's plan lives in Firestore at `users/{uid}.subscriptionPlan`
(`"free" | "pro" | "business"`). The frontend reads it via `authStore` and
gates features with `can()` / `limitOf()` from `plans.js`.

---

## Phase 1 — manual (works today, $0 infra)

1. **Create Stripe Payment Links** (Stripe dashboard → Payment links):
   - one recurring $9/mo link → paste into `PLANS.pro.checkoutUrl`
   - one recurring $29/mo link → `PLANS.business.checkoutUrl`
   - enable "let customers adjust quantity" off; collect email on
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
