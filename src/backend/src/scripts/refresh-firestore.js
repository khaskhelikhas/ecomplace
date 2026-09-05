/**
 * Refresh product data in Firestore.
 *
 * Replaces the old in-process scheduler. Run it:
 *   - locally:        node src/scripts/refresh-firestore.js
 *   - on a schedule:  GitHub Actions (see .github/workflows/refresh-products.yml)
 *
 * Auth (pick one):
 *   - GOOGLE_APPLICATION_CREDENTIALS = path to a service account JSON file
 *   - FIREBASE_SERVICE_ACCOUNT       = the service account JSON as a string
 *
 * With no product API keys set it writes generated demo data, exactly like
 * the old backend did.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateMockProducts } from '../services/mockData.js';
import { fetchDealNews } from '../services/dealFeeds.js';
import { computeSignals } from '../services/signals.js';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ecomplace-app';

function initAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const serviceAccount = JSON.parse(raw);
    return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS
  return initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const hasApiKeys = () =>
  Boolean(
    process.env.KEEPA_API_KEY ||
      process.env.WALMART_API_KEY ||
      process.env.ALIEXPRESS_AFFILIATE_ID
  );

/**
 * Same margin formula the original backend used.
 */
function withMargin(p) {
  const sourcePrice = p.current_price || 0;
  const fbaFee = p.fba_fee || 0;
  const shippingCost = p.shipping_cost || 0;
  const tax = sourcePrice * 0.1;
  const totalCost = sourcePrice + fbaFee + shippingCost + tax;
  const retailPrice = sourcePrice * 1.5;
  const margin = retailPrice > 0 ? ((retailPrice - totalCost) / retailPrice) * 100 : 0;
  return Number(Math.max(0, margin).toFixed(2));
}

/**
 * A stable, filesystem-safe document id per product.
 */
function docId(p) {
  const base = p.asin || p.sku || p.name || 'unknown';
  return `${p.source}__${base}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 400);
}

async function main() {
  initAdmin();
  const db = getFirestore();

  // Real, free deal data from the DealNews public RSS feed. Falls back to
  // generated demo data only if the feed is unreachable.
  let raw = [];
  try {
    raw = await fetchDealNews();
    console.log(`Fetched ${raw.length} live deals from DealNews`);
  } catch (err) {
    console.warn(`DealNews feed failed (${err.message}) - using demo data`);
  }
  if (raw.length === 0) {
    raw = generateMockProducts(40);
    console.log(`Using ${raw.length} demo products`);
  }
  if (!hasApiKeys()) {
    // (Keepa / Walmart / AliExpress calls would be merged in here when keys exist.)
  }

  const now = FieldValue.serverTimestamp();
  let written = 0;

  for (const p of raw) {
    const id = docId(p);
    const ref = db.collection('products').doc(id);
    const current = p.current_price ?? 0;

    // Recent price points (newest first) from earlier refreshes.
    const histSnap = await ref
      .collection('priceHistory')
      .orderBy('recordedAt', 'desc')
      .limit(6)
      .get();
    const pastPrices = histSnap.docs.map((d) => d.data().price);
    const lastSeen = pastPrices[0] ?? current;

    const data = {
      name: p.name,
      category: p.category || 'General',
      source: p.source,
      sourceUrl: p.source_url,
      asin: p.asin || null,
      sku: p.sku || null,
      currentPrice: current,
      // list / was-price from the feed (used for discount + flip margin)
      previousPrice: p.previous_price ?? current,
      // change since the previous refresh
      priceChange: Number((current - lastSeen).toFixed(2)),
      rating: p.rating ?? 0,
      reviewsCount: p.reviews_count ?? 0,
      bestSellersRank: p.best_sellers_rank ?? 9999,
      fbaFee: p.fba_fee ?? 0,
      shippingCost: p.shipping_cost ?? 0,
      // Feed data already carries a real discount %; otherwise estimate.
      marginPercentage: p.margin_percentage ? Number(p.margin_percentage) : withMargin(p),
      imageUrl: p.image_url || null,
      expiresAt: p.expires_at || null,
      fetchedAt: now,
    };

    Object.assign(data, computeSignals(data, [current, ...pastPrices]));

    await ref.set(data, { merge: true });
    await ref.collection('priceHistory').add({
      price: data.currentPrice,
      recordedAt: now,
    });
    written++;
  }

  console.log(`Upserted ${written} products`);

  // Trigger alerts whose condition is now met
  const alertsSnap = await db.collection('alerts').where('isTriggered', '==', false).get();
  let triggered = 0;
  for (const alertDoc of alertsSnap.docs) {
    const a = alertDoc.data();
    const prod = await db.collection('products').doc(a.productId).get();
    if (!prod.exists) continue;
    const pd = prod.data();
    const hit =
      (a.targetPrice != null && pd.currentPrice <= a.targetPrice) ||
      (a.targetMargin != null && pd.marginPercentage >= a.targetMargin);
    if (hit) {
      await alertDoc.ref.update({ isTriggered: true, triggeredAt: now });
      triggered++;
    }
  }
  console.log(`Triggered ${triggered} alerts`);

  // Trim price history to the newest 30 points per product
  const productsSnap = await db.collection('products').get();
  for (const prodDoc of productsSnap.docs) {
    const hist = await prodDoc.ref
      .collection('priceHistory')
      .orderBy('recordedAt', 'desc')
      .offset(30)
      .get();
    for (const old of hist.docs) await old.ref.delete();
  }

  console.log('Refresh complete');
}

main().catch((err) => {
  console.error('Refresh failed:', err);
  process.exit(1);
});
