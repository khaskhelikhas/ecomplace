# EcomPlace — Roadmap to $500–1,000/month

## The honest bottleneck

The app already has more features than most deal sites: real feeds, buy/watch
signals, profit calculator, sourcing list, alerts, affiliate plumbing.

**Features are not what is stopping the money — traffic is.**
Right now every page is behind a login wall, so:

- Google cannot index a single deal → **zero organic traffic**
- A shared link shows a login screen, not the deal → **shares do not convert**
- No public content → **no SEO flywheel**

Everything below is ordered by *dollars per hour of work*.

---

## Tier 1 — TRAFFIC (do this first; nothing else matters without it)

### 1. Public deal pages (biggest single win)
- Each deal gets a public URL like `/d/holypoint-air-duster` — no login to view
- Login stays required only for alerts, sourcing, settings, personal affiliate
- Firestore rule: `products` becomes publicly readable (still write-locked)

### 2. Static HTML + SEO from the 20-minute job
The GitHub Action already runs Node every 20 min. Extend it to also:
- render a real static HTML page per deal (title, price, image, CTA, signal)
- build `sitemap.xml` + an index/browse page
- `firebase deploy --only hosting`

Result: Google indexes real HTML that is at most 20 min old. The SPA keeps
serving logged-in users; bots and first-time visitors get fast static pages.

### 3. Social auto-distribution
- **Telegram channel** — already coded, just add `TELEGRAM_BOT_TOKEN`
- **Pinterest** — auto-create a pin per BUY NOW deal (Pinterest API, free)
- **"Deal of the day" share image** — generate a branded PNG per top deal

### 4. Open Graph / structured data
- per-page `og:title/description/image` so shares look good
- `schema.org/Product` + `Offer` JSON-LD so Google shows rich results

---

## Tier 2 — CONVERSION (turn a visitor into an affiliate click)

### 5. One obvious CTA
Big "Get this deal at Amazon →" button above the fold, affiliate-tagged.

### 6. Real urgency (from data we already have)
- `expiresAt` → "Deal ends in 6h" countdown
- price history → "Lowest price we've seen" badge

### 7. Keep them clicking
- "Related deals" (same category / retailer) on every deal page
- "More BUY NOW deals" rail

---

## Tier 3 — RETENTION (repeat visits = repeat commission)

### 8. Weekly email digest
`sendDealDigest()` is already written — add a weekly GitHub Action that emails
every user the top 10 deals (linking to *your* deal pages, not straight to Amazon).

### 9. Browser push notifications
Firebase Cloud Messaging — "🔥 New BUY NOW deal" push for opted-in users.

### 10. Daily "deal of the day" email on signup

---

## Tier 4 — MONETIZATION EXTRAS (once traffic exists)

| Lever | Notes |
|---|---|
| **Skimlinks / Sovrn Commerce** | auto-monetises *every* outbound link across 48k merchants — one script, catches retailers you have not joined |
| **Google AdSense** | 1–2 ad slots on public deal pages |
| **Sponsored deal slot** | a retailer pays to pin their deal to the top |
| **Newsletter sponsorship** | $100–300 per send once the list is 1k+ |
| **Pro subscription** | $9/mo — unlimited alerts + personal affiliate tags |

---

## Realistic path to the goal

| Month | Focus | Expected |
|---|---|---|
| 1 | Public pages + sitemap + Telegram + Pinterest | 50–150 visits/day |
| 2–3 | Publish 2–3 short social videos/week, grow Telegram, SEO compounding | 300–800 visits/day |
| 3–4 | Add Skimlinks + AdSense + weekly digest | first **$150–400/mo** |
| 5–6 | SEO pages ranking, list at 1–2k, consistent posting | **$500–1,000/mo** |

The compounding engine is **SEO deal pages + a Telegram/Pinterest habit**.
Affiliate income is a volume game — the first $100/mo is the hard part.

---

## Suggested build order (my recommendation)

1. **Public deal pages + static SEO generation in the cron** (unlocks everything)
2. **Open Graph + sitemap + JSON-LD**
3. **Telegram + Pinterest auto-posting**
4. **Conversion polish** (CTA, urgency, related deals)
5. **Weekly digest + Skimlinks + AdSense**
