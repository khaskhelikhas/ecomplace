# EcomPlace — Plan Comparison

_Last updated: 2026-09-06_

Four tiers: **Free**, **Starter**, **Pro**, **Agency**. Every paid tier is a
strict superset of the one below it. Monthly or annual billing (annual ≈ 2
months free). A **founding offer** locks the first 100 paying members into
these prices for life.

Source of truth for all gating: [`src/frontend/src/lib/plans.js`](src/frontend/src/lib/plans.js).

---

## 1. Price

| Plan    | Monthly | Annual   | Effective /mo on annual |
| ------- | ------- | -------- | ----------------------- |
| Free    | $0      | $0       | $0                      |
| Starter | $19     | $190     | ~$15.83                 |
| Pro     | $49     | $490     | ~$40.83                 |
| Agency  | $99     | $990     | ~$82.50                 |

---

## 2. Feature matrix

| Capability                                    | Free | Starter | Pro | Agency |
| --------------------------------------------- | :--: | :-----: | :-: | :----: |
| Browse all live deals (refreshed every 20 min) |  ✅  |   ✅    | ✅  |  ✅    |
| Buy / Watch / Skip signal on every deal        |  ✅  |   ✅    | ✅  |  ✅    |
| Deal Signal engine (drop-chance, flip margin)  |  ✅  |   ✅    | ✅  |  ✅    |
| Per-deal profit calculator                     |  ✅  |   ✅    | ✅  |  ✅    |
| Public SEO deal pages + sitemap                |  ✅  |   ✅    | ✅  |  ✅    |
| **Price alerts (per-product)**                 | 3    | 25      | ∞   | ∞      |
| **Sourcing list items**                        | 10   | ∞       | ∞   | ∞      |
| **Category alerts** (any deal in a category)   |  —   |   ✅    | ✅  |  ✅    |
| **CSV export** of the deal list                |  —   |   ✅    | ✅  |  ✅    |
| **Your own affiliate IDs** on "View deal" links |  —   |   ✅    | ✅  |  ✅    |
| **ASIN / URL analyzer** (single)               |  —   |   —     | ✅  |  ✅    |
| &nbsp;&nbsp;↳ Keepa + camelcamelcamel charts   |  —   |   —     | ✅  |  ✅    |
| &nbsp;&nbsp;↳ FBA profit / ROI / break-even    |  —   |   —     | ✅  |  ✅    |
| **Bulk analysis** (up to 200 ASINs, CSV out)   |  —   |   —     | ✅  |  ✅    |
| **JSON deals API** (`/api/*.json`, CORS-open)  |  —   |   —     | —   |  ✅    |
| **Team seats**                                 |  1   |   1     | 1   |  5     |
| White-label + priority support                 |  —   |   —     | —   |  ✅    |

`∞` = no limit. `—` = not included (shown in-app as a locked upsell).

---

## 3. What each tier adds over the one below

### Free — the hook

Everything needed to *evaluate* deals:

- The full deal feed, refreshed every 20 minutes, each row scored **BUY NOW /
  WATCH / SKIP** with a plain-English reason.
- Drop-chance %, estimated flip margin, "deal ends in ~Nh".
- The per-deal profit calculator (buy price, fees, shipping → net margin).
- **3 price alerts**, **10 sourcing-list items** — enough to try the workflow.

### Starter — $19/mo — "run it as a side hustle"

Adds the tools you need once you are actually buying and reselling:

| Added                | Why it matters                                                        | Where in the app |
| -------------------- | ------------------------------------------------------------------- | ---------------- |
| **Unlimited sourcing** | Track every candidate, not just 10.                                | Sourcing page |
| **25 price alerts**    | Watch a real basket of products (Free = 3).                        | Alerts page — counter reads `X / 25 used` |
| **Category alerts**    | "Email me when *any* Home-Furniture deal hits 40% off" — you stop refreshing the page. | Alerts page — "+ New category alert" box |
| **CSV export**         | Pull the deal list into a sheet for your own analysis.             | Deals page — "⬇ Export CSV" button |
| **Your own affiliate IDs** | "View deal" links carry *your* Amazon / eBay tags, so purchases you drive pay *you*. | Settings → "Your affiliate ids" |

### Pro — $49/mo — "source at volume"

Adds product-research firepower:

| Added                    | Why it matters                                                     | Where in the app |
| ------------------------ | --------------------------------------------------------------- | ---------------- |
| **ASIN / URL analyzer**  | Paste any Amazon link → Keepa & camelcamelcamel price-history charts, a full FBA profit / ROI / break-even breakdown, and a BUY / MAYBE / PASS call. Cross-checked against our live feed. | Analyzer page |
| **Bulk analysis**        | Paste **up to 200** ASINs or URLs at once → a scored table (in-our-deals?, price, margin, est. ROI, call) with Amazon + Keepa links per row, exportable as CSV. Turn a supplier list into a buy list in one paste. | Analyzer page → "Bulk analysis" panel |
| **Unlimited price alerts** | No 25-alert ceiling.                                          | Alerts page — counter reads `X used` (no cap) |

### Agency — $99/mo — "build on top of it / run a team"

Adds programmatic access and multi-user:

| Added              | Why it matters                                                          | Where in the app |
| ------------------ | ------------------------------------------------------------------- | ---------------- |
| **JSON deals API** | The full scored feed as static JSON — `GET /api/deals.json`, `/api/deals.buy-now.json`, `/api/meta.json`. CORS-open, regenerated every 20 min, short CDN cache. Wire it into your own dashboard, a Telegram/Discord bot, a Google Sheet (`=IMPORTDATA`), or a storefront. | API page — endpoints, token, code samples |
| **Personal token** | Generate / revoke an `ecp_…` token. The feed is open today; the token identifies your integration and becomes the auth credential when metered limits launch — send it now so nothing breaks later. | API page → "Your token" |
| **5 team seats**   | Add up to 5 teammate emails; each registers their own login and is granted full Agency access. | API page → "Team seats" |
| **White-label + priority support** | Remove EcomPlace branding on shared/exported material; front-of-queue support. | By arrangement — contact support |

---

## 4. The JSON API (Agency)

Base URL: `https://ecomplace-app-4db34.web.app`

| Endpoint                  | Contents                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `GET /api/deals.json`     | `{ generatedAt, count, deals: [...] }` — every live deal   |
| `GET /api/deals.buy-now.json` | Same shape, filtered to `signal === "BUY NOW"`         |
| `GET /api/meta.json`      | `{ generatedAt, count, buyNow, sources[], categories[], endpoints{}, refreshMinutes }` |

**Deal object fields:**
`id, name, category, source, url` (affiliate-tagged outbound link), `page`
(public deal page URL), `price, listPrice, discountPct, signal`
(`BUY NOW` / `WATCH` / `SKIP`), `dealScore` (0–100), `dropChance`,
`flipMargin`, `trend` (`falling` / `stable` / `rising` / `new`), `reason`,
`image`.

**Refresh cadence:** every 20 minutes (GitHub Actions rebuilds the site and
regenerates these files). `Cache-Control: public, max-age=120, s-maxage=1200`.

**Fair use:** it is a static file on a CDN — cache for a minute or two rather
than polling in a tight loop. Heavy or commercial redistribution needs
written permission.

Examples:

```bash
curl -s https://ecomplace-app-4db34.web.app/api/deals.buy-now.json | jq '.deals[0]'
```

```js
const { deals } = await fetch('https://ecomplace-app-4db34.web.app/api/deals.json').then(r => r.json())
const strong = deals.filter(d => d.signal === 'BUY NOW')
```

```python
import requests
deals = requests.get("https://ecomplace-app-4db34.web.app/api/deals.json").json()["deals"]
buys = [d for d in deals if d["signal"] == "BUY NOW"]
```

---

## 5. How to pay / activate

Two paths, controlled by `PAYMENT.hostedCheckout` in `plans.js`:

### Manual (live now)

1. User opens **Upgrade**, picks a plan + cycle, submits a payment request
   (Wise / bank, Payoneer, JazzCash / Easypaisa, or USDT TRC-20).
2. Request lands in the **Admin panel → Pending upgrade requests**.
3. User pays and replies with the receipt; admin clicks **Approve** →
   `subscriptionPlan` is set and the request is resolved. Access unlocks on
   the user's next page load / tab focus.

### Card checkout (after setup)

Lemon Squeezy (Merchant of Record — accepts global cards, pays out to
Pakistan). To switch it on:

1. Create the 8 products/variants in Lemon Squeezy (Starter/Pro/Agency ×
   monthly/annual).
2. Paste the checkout URLs into `plans.js` (`checkoutUrl` / `checkoutUrlYear`).
3. Fill `LS_VARIANT_TO_PLAN` with each variant id → plan key.
4. Set `PAYMENT.hostedCheckout = true`.
5. Deploy the Cloudflare Worker in `payments/lemonsqueezy-worker.js` and point
   the Lemon Squeezy webhook at it (it verifies the HMAC signature and writes
   `subscriptionPlan` straight to Firestore).

Team seats are always granted by the admin: the Agency owner lists teammate
emails on the API page, then the admin sets each of those users to `agency`
in the Admin panel.

---

## 6. How gating works (technical)

- `planOf(user)` → the plan object for `user.subscriptionPlan` (defaults to
  `free`).
- `can(user, feature)` → boolean, e.g. `can(user, 'bulkAnalysis')`.
- `limitOf(user, key)` → number (or `Infinity`), e.g. `limitOf(user, 'alerts')`.
- `minPlanFor(feature)` → name of the cheapest plan that includes a feature,
  used for accurate upsell labels ("Export CSV · Starter").
- `isAdmin(user)` is **separate** from plans — it comes from a signed Firebase
  custom claim, not from `subscriptionPlan`.

Pages read these helpers directly and render either the feature or a locked
upsell card linking to `/upgrade`. Server-side, `refresh-firestore.js` honours
`type: 'category'` alerts; everything else is a client gate over data that is
already public-readable, so the API feed is intentionally open for now.

---

## 7. One-line pitch per tier

- **Free** — see every deal, scored, with a profit calculator.
- **Starter ($19)** — unlimited sourcing, category alerts, CSV, your own
  affiliate links.
- **Pro ($49)** — the ASIN analyzer + bulk 200-at-once analysis + unlimited
  alerts.
- **Agency ($99)** — the JSON API, 5 seats, white-label, priority support.
