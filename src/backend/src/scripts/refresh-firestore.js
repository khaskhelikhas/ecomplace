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
import { fetchAllDeals } from '../services/dealFeeds.js';
import { computeSignals } from '../services/signals.js';
import { affiliateUrl } from '../services/affiliate.js';
import { notifyTriggeredAlert } from '../services/notify.js';
import { postDealToTelegram } from '../services/telegram.js';

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
    raw = await fetchAllDeals();
    console.log(`Fetched ${raw.length} live deals from free feeds`);
  } catch (err) {
    console.warn(`Deal feeds failed (${err.message}) - using demo data`);
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
  let posted = 0;
  const snapshotRows = [];

  for (const p of raw) {
    const id = docId(p);
    const ref = db.collection('products').doc(id);
    const prevDoc = await ref.get();
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
      sourceUrl: affiliateUrl(p.source_url, p.source),
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
      // Only show a discount when the feed gave us a real list/was price.
      marginPercentage: Number(p.margin_percentage) || 0,
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

    // Lightweight row for the list snapshot (no server timestamps inside arrays).
    snapshotRows.push({
      id,
      name: data.name,
      category: data.category,
      source: data.source,
      sourceUrl: data.sourceUrl,
      currentPrice: data.currentPrice,
      previousPrice: data.previousPrice,
      marginPercentage: data.marginPercentage,
      rating: data.rating,
      imageUrl: data.imageUrl,
      bestSellersRank: data.bestSellersRank,
      dealScore: data.dealScore ?? 0,
      recommendation: data.recommendation ?? 'WATCH',
      reason: data.reason ?? '',
      trend: data.trend ?? 'stable',
      dropChance: data.dropChance ?? null,
      flipMargin: data.flipMargin ?? 0,
      expiresInHours: data.expiresInHours ?? null,
    });

    // Broadcast a fresh strong deal to Telegram once.
    const wasPosted = prevDoc.exists && prevDoc.data().postedToTelegram;
    if (data.recommendation === 'BUY NOW' && !wasPosted) {
      const ok = await postDealToTelegram(data);
      if (ok) {
        await ref.set({ postedToTelegram: true }, { merge: true });
        posted++;
      }
    }
  }

  console.log(`Upserted ${written} products` + (posted ? `, posted ${posted} to Telegram` : ''));

  // One small doc the dashboard / deals pages read instead of every product.
  snapshotRows.sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0));
  await db.collection('snapshots').doc('latest').set({
    products: snapshotRows,
    count: snapshotRows.length,
    updatedAt: now,
  });
  console.log(`Wrote list snapshot (${snapshotRows.length} products)`);

  // Trigger alerts whose condition is now met, and email the owner.
  const alertsSnap = await db.collection('alerts').where('isTriggered', '==', false).get();
  let triggered = 0;
  let emailed = 0;
  for (const alertDoc of alertsSnap.docs) {
    const a = alertDoc.data();
    const prod = await db.collection('products').doc(a.productId).get();
    if (!prod.exists) continue;
    const pd = prod.data();
    const hit =
      (a.targetPrice != null && pd.currentPrice <= a.targetPrice) ||
      (a.targetMargin != null && pd.marginPercentage >= a.targetMargin);
    if (!hit) continue;

    await alertDoc.ref.update({ isTriggered: true, triggeredAt: now });
    triggered++;

    let email = null;
    try {
      const u = await db.collection('users').doc(a.userId).get();
      email = u.exists ? u.data().email : null;
    } catch {
      /* ignore */
    }
    if (email && (await notifyTriggeredAlert({ email, product: pd, alert: a }))) {
      await alertDoc.ref.update({ notificationSent: true });
      emailed++;
    }
  }
  console.log(`Triggered ${triggered} alerts` + (emailed ? `, emailed ${emailed}` : ''));

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

  // Health record so a failing cron is visible.
  await db.collection('snapshots').doc('refreshStatus').set({
    ok: true,
    dealCount: snapshotRows.length,
    ranAt: now,
  });

  console.log('Refresh complete');
}

main().catch(async (err) => {
  console.error('Refresh failed:', err);
  try {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    await getFirestore()
      .collection('snapshots')
      .doc('refreshStatus')
      .set(
        { ok: false, error: String(err?.message || err), ranAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
  } catch {
    /* best effort */
  }
  process.exit(1);
});
