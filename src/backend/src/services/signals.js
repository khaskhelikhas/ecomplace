/**
 * Heuristic "deal signal" engine.
 *
 * Given a product and its recent price points, it estimates:
 *   - trend          : where the price is heading ('falling' | 'stable' | 'rising')
 *   - dropChance      : rough % chance the price falls further in the near term
 *   - expiresInHours  : hours left on the deal (from the feed's expiry field)
 *   - flipMargin      : estimated profit if bought at this price and resold at
 *                       the list price, after ~15% fees + shipping
 *   - dealScore       : 0-100 composite quality score
 *   - recommendation  : 'BUY NOW' | 'WATCH' | 'SKIP' + a short reason
 *
 * These are rules of thumb over limited data - useful as a nudge, not a promise.
 */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function computeSignals(product, historyPricesNewestFirst = []) {
  const price = Number(product.currentPrice) || 0;
  const list = Number(product.previousPrice) || price;
  const discount = Number(product.marginPercentage) || 0;
  const rating = Number(product.rating) || 0;

  // --- price trend from the recent series (oldest -> newest) ---
  const series = [...historyPricesNewestFirst].reverse();
  let trend = 'stable';
  let slopePct = 0;
  if (series.length >= 2) {
    const first = series[0];
    const last = series[series.length - 1];
    slopePct = first ? ((last - first) / first) * 100 : 0;
    if (slopePct <= -2) trend = 'falling';
    else if (slopePct >= 2) trend = 'rising';
  }

  // --- time left on the deal ---
  let expiresInHours = null;
  if (product.expiresAt) {
    const ms = new Date(product.expiresAt).getTime() - Date.now();
    if (!Number.isNaN(ms)) expiresInHours = Math.max(0, Math.round(ms / 3_600_000));
  }

  // --- flip margin: buy now, value at list price, minus fees + shipping ---
  const fees = price * 0.15 + 3;
  const flipMargin = Math.max(0, list - price - fees);
  const flipMarginPct = list ? Number(((flipMargin / list) * 100).toFixed(1)) : 0;

  // --- chance it drops further ---
  let dropChance = 25;
  if (trend === 'falling') dropChance += 35;
  if (trend === 'rising') dropChance -= 15;
  if (discount < 15) dropChance += 10; // shallow cut = room to fall
  if (discount > 50) dropChance -= 15; // already deep
  if (expiresInHours != null && expiresInHours <= 6) dropChance -= 25; // ending soon
  dropChance = clamp(Math.round(dropChance), 5, 90);

  // --- composite deal score ---
  let score = 0;
  score += Math.min(45, discount * 0.7);
  score += Math.min(25, flipMarginPct * 0.8);
  if (trend === 'falling') score += 12;
  if (expiresInHours != null && expiresInHours > 0 && expiresInHours <= 24) score += 10;
  if (rating >= 4) score += 8;
  score = clamp(Math.round(score), 0, 100);

  // --- recommendation ---
  let recommendation;
  let reason;
  const endsSoonBits = expiresInHours != null ? `, ends in ${expiresInHours}h` : '';

  if (score >= 65 && dropChance < 55 && (expiresInHours == null || expiresInHours <= 72)) {
    recommendation = 'BUY NOW';
    reason = `${discount}% off, ~$${flipMargin.toFixed(0)} est. margin${endsSoonBits}`;
  } else if (trend === 'falling' && dropChance >= 55) {
    recommendation = 'WATCH';
    reason = `price sliding (${slopePct.toFixed(1)}%) - likely a bit cheaper in the next few hours`;
  } else if (score >= 45) {
    recommendation = 'WATCH';
    reason = `solid deal (${discount}% off) - hold for a deeper cut`;
  } else {
    recommendation = 'SKIP';
    reason = `thin margin / small discount`;
  }

  return {
    trend,
    slopePct: Number(slopePct.toFixed(1)),
    expiresInHours,
    flipMargin: Number(flipMargin.toFixed(2)),
    flipMarginPct,
    dropChance,
    dealScore: score,
    recommendation,
    reason,
    signalAt: new Date().toISOString(),
  };
}
