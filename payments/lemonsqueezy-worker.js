/**
 * Cloudflare Worker — Lemon Squeezy webhook -> Firestore plan sync.
 *
 * Card payments from international clients work through Lemon Squeezy
 * (a Merchant of Record: it takes global cards, handles tax, and pays out
 * to Pakistan via Payoneer / wire). This worker flips the buyer's plan
 * automatically the moment a payment succeeds — no admin step.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SETUP (all free, ~15 min)
 *
 * 1. Lemon Squeezy → create a Store, then a Product per plan with a
 *    Monthly and an Annual variant (Starter $19/$190, Pro $49/$490,
 *    Agency $99/$990). Copy each variant's "Buy" URL into
 *    src/frontend/src/lib/plans.js (checkoutUrl / checkoutUrlYear) and set
 *    PAYMENT.hostedCheckout = true in that file, then redeploy the frontend.
 *
 * 2. Note every variant id (Product → variant → the number in the URL) and
 *    build the map, e.g.  {"111111":"starter","111112":"starter",
 *    "222221":"pro","222222":"pro","333331":"agency","333332":"agency"}
 *
 * 3. Firebase → Project settings → Service accounts → Generate new private
 *    key. From that JSON you need client_email and private_key.
 *
 * 4. Cloudflare → Workers → Create → paste this file. Add these variables
 *    (Settings → Variables), all as *Secrets*:
 *       LS_WEBHOOK_SECRET     the signing secret you set on the LS webhook
 *       LS_VARIANT_MAP        the JSON map from step 2
 *       FIREBASE_PROJECT_ID   ecomplace-app-4db34
 *       FIREBASE_CLIENT_EMAIL from the service account JSON
 *       FIREBASE_PRIVATE_KEY  from the service account JSON (keep the \n)
 *    Deploy. Copy the worker URL.
 *
 * 5. Lemon Squeezy → Settings → Webhooks → add the worker URL, set the same
 *    signing secret, and check: order_created, subscription_created,
 *    subscription_updated, subscription_cancelled, subscription_expired,
 *    subscription_resumed, subscription_paused.
 *
 * That's it. Test with LS's "Send test event" button.
 * ─────────────────────────────────────────────────────────────────────────
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('ok', { status: 200 });

    const raw = await request.text();

    // 1. verify signature
    const ok = await verify(raw, request.headers.get('X-Signature') || '', env.LS_WEBHOOK_SECRET);
    if (!ok) return new Response('bad signature', { status: 401 });

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response('bad json', { status: 400 });
    }

    const eventName = body?.meta?.event_name;
    const uid = body?.meta?.custom_data?.uid;
    const attrs = body?.data?.attributes || {};
    const variantId = String(attrs.variant_id ?? attrs.first_subscription_item?.variant_id ?? '');
    const status = attrs.status; // 'active' | 'cancelled' | 'expired' | 'paused' | ...

    if (!uid) return new Response('no uid in custom_data', { status: 200 });

    const map = safeJson(env.LS_VARIANT_MAP) || {};
    let plan = null;

    if (
      eventName === 'order_created' ||
      eventName === 'subscription_created' ||
      eventName === 'subscription_resumed' ||
      (eventName === 'subscription_updated' && status === 'active')
    ) {
      plan = map[variantId] || null;
    } else if (
      eventName === 'subscription_expired' ||
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_paused' ||
      (eventName === 'subscription_updated' && status && status !== 'active')
    ) {
      plan = 'free';
    }

    if (!plan) return new Response(`ignored ${eventName}/${status}`, { status: 200 });

    try {
      await setPlan(env, uid, plan, { variantId, eventName, status });
    } catch (e) {
      return new Response('firestore error: ' + e.message, { status: 500 });
    }
    return new Response(`ok — ${uid} -> ${plan}`, { status: 200 });
  },
};

/* ---------- signature ---------- */
async function verify(raw, sigHex, secret) {
  if (!secret || !sigHex) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  // constant-time-ish compare
  if (hex.length !== sigHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ sigHex.charCodeAt(i);
  return diff === 0;
}

const safeJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/* ---------- Firestore REST write via a service-account token ---------- */
async function setPlan(env, uid, plan, meta) {
  const token = await googleToken(env);
  const pid = env.FIREBASE_PROJECT_ID;
  const url =
    `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/users/${uid}` +
    `?updateMask.fieldPaths=subscriptionPlan&updateMask.fieldPaths=planUpdatedAt&updateMask.fieldPaths=billing`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        subscriptionPlan: { stringValue: plan },
        planUpdatedAt: { timestampValue: new Date().toISOString() },
        billing: {
          mapValue: {
            fields: {
              provider: { stringValue: 'lemonsqueezy' },
              variantId: { stringValue: String(meta.variantId || '') },
              lastEvent: { stringValue: String(meta.eventName || '') },
              status: { stringValue: String(meta.status || '') },
            },
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

let _tok = { value: null, exp: 0 };
async function googleToken(env) {
  if (_tok.value && Date.now() < _tok.exp - 60_000) return _tok.value;

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (o) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(claim)}`;

  const pem = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const der = pemToDer(pem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt =
    unsigned +
    '.' +
    btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('token: ' + JSON.stringify(json));
  _tok = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return _tok.value;
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
