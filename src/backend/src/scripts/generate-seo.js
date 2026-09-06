/**
 * Generate static, SEO-friendly HTML pages for every deal and deploy them
 * alongside the SPA. Run after refresh-firestore.js:
 *
 *   node src/scripts/generate-seo.js               # writes into ../frontend/dist
 *   firebase deploy --only hosting                 # publishes them
 *
 * Output:
 *   dist/d/<slug>.html   one page per deal (public, no login)
 *   dist/deals/index.html   browse-all page
 *   dist/sitemap.xml
 *   dist/robots.txt
 *
 * Auth: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT.
 */
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', '..', '..', 'frontend', 'dist');
const SITE = process.env.APP_URL || 'https://ecomplace-app-4db34.web.app';
const BRAND = 'EcomPlace';

function initAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) initializeApp({ credential: cert(JSON.parse(raw)) });
  else initializeApp({ credential: applicationDefault() });
}

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const slugify = (s = '') =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);

const pageSlug = (p) => `${slugify(p.name)}-${p.id.slice(-6)}`;

const prettySource = (s = '') => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const SIGNAL_COLOR = { 'BUY NOW': '#059669', WATCH: '#b45309', SKIP: '#64748b' };

function dealPage(p) {
  const slug = pageSlug(p);
  const url = `${SITE}/d/${slug}`;
  const title = `${p.name} — $${p.currentPrice}${p.marginPercentage ? ` (${p.marginPercentage}% off)` : ''} | ${BRAND}`;
  const desc =
    `${p.name} is $${p.currentPrice} at ${prettySource(p.source)}` +
    (p.marginPercentage ? `, ${p.marginPercentage}% off` : '') +
    `. ${BRAND} rates it ${p.recommendation || 'WATCH'} — ${esc(p.reason || 'tracked for price drops')}.`;
  const img = p.imageUrl || `${SITE}/icon-512x512.png`;
  const sig = p.recommendation || 'WATCH';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: img ? [img] : undefined,
    description: desc,
    category: p.category || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: p.currentPrice,
      availability: 'https://schema.org/InStock',
      url: p.sourceUrl || url,
      seller: { '@type': 'Organization', name: prettySource(p.source) },
    },
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(p.name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index,follow">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
:root{--b:#4f46e5}
*{box-sizing:border-box;margin:0}
body{font:16px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;background:#f6f7fb}
a{color:var(--b)}
.wrap{max-width:640px;margin:0 auto;padding:20px 16px 60px}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.brand{font-weight:800;color:var(--b);text-decoration:none;font-size:18px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 8px 24px -14px rgba(15,23,42,.15)}
.img{width:100%;height:260px;object-fit:contain;background:#f8fafc;border-radius:10px;margin-bottom:16px}
h1{font-size:22px;line-height:1.3;margin-bottom:12px}
.price{font-size:30px;font-weight:800}
.was{color:#94a3b8;text-decoration:line-through;margin-left:8px;font-size:18px}
.chip{display:inline-block;padding:3px 9px;border-radius:7px;font-size:12px;font-weight:700}
.disc{background:#d1fae5;color:#047857;margin-left:8px}
.sig{color:#fff;padding:4px 10px;border-radius:8px;font-weight:700;font-size:13px}
.meta{color:#475569;font-size:14px;margin:14px 0}
.cta{display:block;text-align:center;background:var(--b);color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:10px;margin-top:18px}
.cta2{display:block;text-align:center;border:1px solid #cbd5e1;color:#334155;text-decoration:none;padding:12px;border-radius:10px;margin-top:10px}
.note{font-size:12px;color:#94a3b8;margin-top:14px}
.more{margin-top:34px}
.more h2{font-size:15px;color:#475569;margin-bottom:10px}
.more a{display:block;padding:8px 0;border-top:1px solid #e2e8f0;text-decoration:none;color:#0f172a;font-size:14px}
footer{margin-top:40px;font-size:12px;color:#94a3b8;text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <a class="brand" href="${SITE}/">🛍️ ${BRAND}</a>
    <a href="${SITE}/deals">All deals</a>
  </div>

  <div class="card">
    ${p.imageUrl ? `<img class="img" src="${esc(p.imageUrl)}" alt="${esc(p.name)}">` : ''}
    <span class="sig" style="background:${SIGNAL_COLOR[sig]}">${sig}</span>
    <span class="chip" style="background:#f1f5f9;color:#475569;margin-left:8px">${esc(prettySource(p.source))}</span>
    <h1>${esc(p.name)}</h1>
    <div>
      <span class="price">$${p.currentPrice}</span>
      ${p.previousPrice > p.currentPrice ? `<span class="was">$${p.previousPrice}</span>` : ''}
      ${p.marginPercentage ? `<span class="chip disc">−${p.marginPercentage}% off</span>` : ''}
    </div>
    <p class="meta">${esc(p.reason || 'Tracked for price drops.')}${
      p.expiresInHours != null && p.expiresInHours > 0 ? ` · deal ends in ~${p.expiresInHours}h` : ''
    }${p.flipMargin > 0 ? ` · est. flip margin ~$${Math.round(p.flipMargin)}` : ''}</p>

    <a class="cta" href="${esc(p.sourceUrl || url)}" rel="nofollow sponsored" target="_blank">
      Get this deal at ${esc(prettySource(p.source))} →
    </a>
    <a class="cta2" href="${SITE}/register">Track this price free →</a>
    <p class="note">Price checked automatically and may change — confirm on the retailer's site.
    Outbound links may earn ${BRAND} a commission.</p>
  </div>

  __MORE__

  <footer>
    © ${new Date().getFullYear()} ${BRAND} ·
    <a href="${SITE}/terms">Terms</a> · <a href="${SITE}/privacy">Privacy</a>
  </footer>
</div>
</body>
</html>`;
}

function browsePage(products) {
  const rows = products
    .map(
      (p) => `<a class="item" href="/d/${pageSlug(p)}">
        <span>${esc(p.name)}</span>
        <b>$${p.currentPrice}${p.marginPercentage ? ` &middot; ${p.marginPercentage}% off` : ''} &middot; ${esc(
        prettySource(p.source)
      )}</b>
      </a>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>All deals — ${BRAND}</title>
<meta name="description" content="Every live deal tracked by ${BRAND}: prices from Amazon, Walmart, eBay, Best Buy and more, refreshed every 20 minutes with buy/watch/skip signals.">
<link rel="canonical" href="${SITE}/deals">
<meta name="robots" content="index,follow">
<style>
body{font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;background:#f6f7fb;margin:0}
.wrap{max-width:720px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:24px;margin:0 0 4px}
p.sub{color:#64748b;margin:0 0 20px}
a.item{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #e2e8f0;text-decoration:none;color:#0f172a;font-size:14px}
a.item b{color:#475569;font-weight:600;white-space:nowrap}
.brand{font-weight:800;color:#4f46e5;text-decoration:none}
</style></head><body><div class="wrap">
<a class="brand" href="${SITE}/">🛍️ ${BRAND}</a>
<h1>All live deals</h1>
<p class="sub">${products.length} deals · refreshed every 20 minutes · <a href="${SITE}/register">create a free account</a> for alerts &amp; the profit calculator.</p>
${rows}
</div></body></html>`;
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const snap = await db.collection('snapshots').doc('latest').get();
  const products = (snap.exists && snap.data().products) || [];
  if (!products.length) {
    console.log('No products in snapshot — nothing to generate.');
    return;
  }

  rmSync(join(DIST, 'd'), { recursive: true, force: true });
  mkdirSync(join(DIST, 'd'), { recursive: true });
  mkdirSync(join(DIST, 'deals'), { recursive: true });

  // "More deals" block: link 6 others for internal linking.
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const others = products
      .filter((_, j) => j !== i)
      .slice(0, 6)
      .map((o) => `<a href="/d/${pageSlug(o)}">${esc(o.name)} — $${o.currentPrice}</a>`)
      .join('\n');
    const html = dealPage(p).replace(
      '__MORE__',
      `<div class="more"><h2>More deals</h2>${others}</div>`
    );
    writeFileSync(join(DIST, 'd', `${pageSlug(p)}.html`), html);
  }

  writeFileSync(join(DIST, 'deals', 'index.html'), browsePage(products));

  const urls = [
    `${SITE}/`,
    `${SITE}/deals`,
    ...products.map((p) => `${SITE}/d/${pageSlug(p)}`),
  ];
  writeFileSync(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url><loc>${u}</loc><changefreq>hourly</changefreq><lastmod>${new Date()
              .toISOString()
              .slice(0, 10)}</lastmod></url>`
        )
        .join('\n') +
      `\n</urlset>\n`
  );

  writeFileSync(
    join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`
  );

  console.log(`Generated ${products.length} deal pages + browse + sitemap into dist/`);
}

main().catch((e) => {
  console.error('SEO generation failed:', e);
  process.exit(1);
});
