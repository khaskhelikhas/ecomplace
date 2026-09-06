# Turning on the extra features

Everything below is **optional** and free-tier. The site runs without any of
it - each feature switches on the moment you add its secret in
**GitHub → repo → Settings → Secrets and variables → Actions**.

After adding secrets, run the workflow once to apply:
https://github.com/khaskhelikhas/ecomplace/actions/workflows/refresh-products.yml
→ Run workflow

---

## 1. Affiliate links (the money)

Every outbound "View deal" link gets your tracking tag, so purchases earn a
commission.

| Program | Sign up | Secret name | Secret value |
|---|---|---|---|
| **Amazon Associates** | https://affiliate-program.amazon.com | `AMAZON_ASSOC_TAG` | your tag, e.g. `mystore-20` |
| **eBay Partner Network** | https://partnernetwork.ebay.com | `EBAY_CAMPAIGN_ID` | your campaign id, e.g. `5339000000` |
| **Walmart Creator / Impact** | https://creator.walmart.com | `WALMART_AFFILIATE_QS` | the query string they give you, e.g. `veh=aff&sourceid=imp_000&u1=ecomplace` |
| **AliExpress Portals** | https://portals.aliexpress.com | `ALIEXPRESS_AFFILIATE_QS` | your deep-link query string |
| Any other retailer | — | `GENERIC_AFFILIATE_QS` | a sub-id you append everywhere |

Start with **Amazon** - it is most of the traffic and approval is quick.

---

## 2. Email price alerts (Resend - free 3,000/mo)

1. Sign up at https://resend.com
2. **API Keys** → create one → secret `RESEND_API_KEY`
3. (optional) verify a domain, then set `NOTIFY_FROM` to
   `EcomPlace <deals@yourdomain.com>`. Without it, test emails send from
   `onboarding@resend.dev`.

When a user's price/margin alert fires, the refresh job emails them a link to
the deal.

---

## 3. Telegram channel broadcast

Auto-posts every fresh **BUY NOW** deal to a channel - great for reach.

1. Open Telegram, message **@BotFather** → `/newbot` → follow prompts →
   copy the **bot token** → secret `TELEGRAM_BOT_TOKEN`
2. Create a public channel, add the bot as an **admin**
3. Secret `TELEGRAM_CHAT_ID` = `@yourchannelname`

---

## 4. Real AliExpress products (free)

Adds live AliExpress items — real titles, images, prices — with **your**
promotion links, alongside the DealNews / Slickdeals feeds. The code is
already wired (`src/backend/src/services/aliexpress.js`); it just needs
credentials.

1. Go to https://portals.aliexpress.com → join the **Affiliate** program
   (free, usually approved fast).
2. In the portal, create a **Tracking ID** (any name, e.g. `ecomplace`).
3. Open the **API / Open Platform** section, create an app → copy the
   **App Key** and **App Secret**.
4. Add these GitHub Actions secrets:

   | Secret | Value |
   |---|---|
   | `ALIEXPRESS_APP_KEY` | your app key |
   | `ALIEXPRESS_APP_SECRET` | your app secret |
   | `ALIEXPRESS_TRACKING_ID` | the tracking id from step 2 |
   | `ALIEXPRESS_KEYWORDS` | *(optional)* comma-separated search terms, e.g. `wireless earbuds,phone case,led strip light` |

5. Run the workflow once. New AliExpress rows appear with
   `source: "aliexpress"` and their `url` is your affiliate promotion link.

If a key is wrong the refresh logs `AliExpress API: <code> <msg>` and simply
skips AliExpress — the rest of the feed is unaffected.

---

## 5. Deep Amazon data (paid, optional)

For Amazon price history / best-seller rank at scale, add a **Keepa**
subscription (~$50/mo), set `KEEPA_API_KEY`, and extend
`src/backend/src/services/` with a Keepa client that `refresh-firestore.js`
merges alongside `fetchAllDeals()`.

> **Alibaba.com (B2B wholesale)** has no free or self-serve API — it needs a
> verified paid membership plus app review — so it is not integrated.
> AliExpress (section 4) is the practical wholesale-style source.

---

## Local testing

```powershell
cd D:\ecomplace\src\backend
$env:GOOGLE_APPLICATION_CREDENTIALS = "D:\ecomplace\serviceAccount.json"
$env:AMAZON_ASSOC_TAG = "mystore-20"        # etc.
npm run refresh:firestore
```
