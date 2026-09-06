import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

/**
 * Firestore data access layer.
 *
 * Collections:
 *   products/{id}
 *   products/{id}/priceHistory/{autoId}
 *   alerts/{id}          (has userId field)
 *   users/{uid}
 */

const num = (v) => (typeof v === 'number' ? v : Number(v) || 0)

// Cache the snapshot for the lifetime of the page load so Dashboard + Deals
// share a single Firestore read.
let _snapshotPromise = null
export function primeProducts() {
  _snapshotPromise = null
}

async function loadAllProducts() {
  // Preferred: one small pre-built doc.
  try {
    const s = await getDoc(doc(db, 'snapshots', 'latest'))
    if (s.exists() && Array.isArray(s.data().products) && s.data().products.length) {
      return s.data().products
    }
  } catch {
    /* fall through to the collection */
  }
  // Fallback: read the product collection directly.
  const snap = await getDocs(
    query(collection(db, 'products'), orderBy('dealScore', 'desc'), fbLimit(500))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Fetch the product list (from the shared snapshot) and filter client-side.
 */
export async function getProducts(filters = {}) {
  if (!_snapshotPromise) _snapshotPromise = loadAllProducts()
  let rows = [...(await _snapshotPromise)]

  if (filters.search) {
    const s = filters.search.toLowerCase()
    rows = rows.filter((p) => (p.name || '').toLowerCase().includes(s))
  }
  if (filters.source && filters.source !== 'all') {
    rows = rows.filter((p) => p.source === filters.source)
  }
  if (filters.minMargin != null) {
    rows = rows.filter((p) => num(p.marginPercentage) >= num(filters.minMargin))
  }
  if (filters.maxMargin != null) {
    rows = rows.filter((p) => num(p.marginPercentage) <= num(filters.maxMargin))
  }

  return rows
}

export async function getBestSellers(max = 20) {
  const snap = await getDocs(
    query(
      collection(db, 'products'),
      orderBy('bestSellersRank', 'asc'),
      fbLimit(max)
    )
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getProduct(id) {
  const ref = doc(db, 'products', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null

  const history = await getDocs(
    query(
      collection(db, 'products', id, 'priceHistory'),
      orderBy('recordedAt', 'desc'),
      fbLimit(30)
    )
  )

  return {
    id: snap.id,
    ...snap.data(),
    priceHistory: history.docs.map((d) => d.data()),
  }
}

export async function getAlerts(userId) {
  if (!userId) return []
  const snap = await getDocs(
    query(collection(db, 'alerts'), where('userId', '==', userId))
  )
  const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return Promise.all(
    alerts.map(async (a) => {
      if (a.type === 'category') {
        return { ...a, name: `Any "${a.category}" deal` }
      }
      try {
        const p = await getDoc(doc(db, 'products', a.productId))
        if (p.exists()) {
          const pd = p.data()
          return {
            ...a,
            name: pd.name,
            currentPrice: pd.currentPrice,
            marginPercentage: pd.marginPercentage,
          }
        }
      } catch {
        /* ignore */
      }
      return a
    })
  )
}

/** Total alerts a user has (for plan limits). */
export async function countAlerts(userId) {
  if (!userId) return 0
  const snap = await getDocs(query(collection(db, 'alerts'), where('userId', '==', userId)))
  return snap.size
}

/** Total sourcing items a user has (for plan limits). */
export async function countSourcing(userId) {
  if (!userId) return 0
  const snap = await getDocs(collection(db, 'users', userId, 'sourcing'))
  return snap.size
}

/** Cheap: number of the user's alerts that have fired but not been seen. */
export async function countUnseenAlerts(userId) {
  if (!userId) return 0
  const snap = await getDocs(
    query(
      collection(db, 'alerts'),
      where('userId', '==', userId),
      where('isTriggered', '==', true)
    )
  )
  return snap.docs.filter((d) => !d.data().seen).length
}

/** Mark all triggered alerts as seen (called when the Alerts page opens). */
export async function markAlertsSeen(userId) {
  if (!userId) return
  const snap = await getDocs(
    query(
      collection(db, 'alerts'),
      where('userId', '==', userId),
      where('isTriggered', '==', true)
    )
  )
  await Promise.all(
    snap.docs.filter((d) => !d.data().seen).map((d) => updateDoc(d.ref, { seen: true }))
  )
}

export async function createAlert({ userId, productId, alertType, targetPrice, targetMargin }) {
  return addDoc(collection(db, 'alerts'), {
    userId,
    type: 'product',
    productId,
    alertType: alertType || 'price',
    targetPrice: targetPrice ?? null,
    targetMargin: targetMargin ?? null,
    isTriggered: false,
    createdAt: serverTimestamp(),
  })
}

/** Starter+: alert when ANY deal in a category hits a discount threshold. */
export async function createCategoryAlert({ userId, category, targetMargin }) {
  return addDoc(collection(db, 'alerts'), {
    userId,
    type: 'category',
    category,
    targetMargin: Number(targetMargin) || 0,
    isTriggered: false,
    createdAt: serverTimestamp(),
  })
}

export async function deleteAlert(id) {
  return deleteDoc(doc(db, 'alerts', id))
}

/** Change an alert's target and re-arm it (isTriggered -> false). */
export async function updateAlertTarget(id, { targetPrice, targetMargin }) {
  return updateDoc(doc(db, 'alerts', id), {
    targetPrice: targetPrice ?? null,
    targetMargin: targetMargin ?? null,
    isTriggered: false,
    seen: false,
    triggeredAt: null,
  })
}

/* ---------------- user profile ---------------- */

export async function getUserProfile(uid) {
  if (!uid) return null
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function saveUserProfile(uid, data) {
  return setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

/* ---------------- admin ---------------- */

export async function listUsers() {
  const snap = await getDocs(query(collection(db, 'users'), fbLimit(1000)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function setUserPlan(uid, plan) {
  return updateDoc(doc(db, 'users', uid), {
    subscriptionPlan: plan,
    planUpdatedAt: serverTimestamp(),
  })
}

/* ---- manual payment requests ---- */

export async function createPaymentRequest({ userId, email, plan, cycle, method, note }) {
  return addDoc(collection(db, 'paymentRequests'), {
    userId,
    email,
    plan,
    cycle: cycle || 'monthly',
    method: method || '',
    note: note || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export async function myPaymentRequests(userId) {
  if (!userId) return []
  const snap = await getDocs(
    query(collection(db, 'paymentRequests'), where('userId', '==', userId))
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export async function listPaymentRequests() {
  const snap = await getDocs(
    query(collection(db, 'paymentRequests'), orderBy('createdAt', 'desc'), fbLimit(200))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Admin: count of unresolved upgrade requests (for the nav badge). */
export async function countPendingRequests() {
  try {
    const snap = await getDocs(
      query(collection(db, 'paymentRequests'), where('status', '==', 'pending'))
    )
    return snap.size
  } catch {
    return 0
  }
}

export async function resolvePaymentRequest(id, status) {
  return updateDoc(doc(db, 'paymentRequests', id), {
    status, // 'approved' | 'rejected'
    resolvedAt: serverTimestamp(),
  })
}

/** Append an entry to the admin audit trail. */
export async function adminLog(action, meta = {}) {
  try {
    await addDoc(collection(db, 'adminLog'), {
      action,
      meta,
      at: serverTimestamp(),
    })
  } catch (e) {
    console.warn('adminLog failed', e)
  }
}

export async function recentAdminLog(n = 25) {
  const snap = await getDocs(
    query(collection(db, 'adminLog'), orderBy('at', 'desc'), fbLimit(n))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getSystemStatus() {
  const [snap, status] = await Promise.all([
    getDoc(doc(db, 'snapshots', 'latest')),
    getDoc(doc(db, 'snapshots', 'refreshStatus')),
  ])
  return {
    dealCount: snap.exists() ? snap.data().count : 0,
    snapshotUpdatedAt: snap.exists() ? snap.data().updatedAt : null,
    refresh: status.exists() ? status.data() : null,
  }
}

/* ---------------- sourcing list ---------------- */

export async function getSourcing(uid) {
  if (!uid) return []
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'sourcing'), orderBy('addedAt', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addSourcing(uid, item) {
  return addDoc(collection(db, 'users', uid, 'sourcing'), {
    ...item,
    qty: item.qty ?? 1,
    sellPrice: item.sellPrice ?? null,
    addedAt: serverTimestamp(),
  })
}

export async function updateSourcing(uid, id, data) {
  return updateDoc(doc(db, 'users', uid, 'sourcing', id), data)
}

export async function removeSourcing(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'sourcing', id))
}

/* ---------------- saved deals / watchlist ---------------- */

export async function getSaved(uid) {
  if (!uid) return []
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'saved'), orderBy('savedAt', 'desc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Doc id = product id, so saving twice is idempotent. */
export async function addSaved(uid, p) {
  return setDoc(doc(db, 'users', uid, 'saved', p.id), {
    productId: p.id,
    name: p.name || '',
    source: p.source || '',
    sourceUrl: p.sourceUrl || null,
    currentPrice: p.currentPrice ?? null,
    marginPercentage: p.marginPercentage ?? 0,
    imageUrl: p.imageUrl || null,
    recommendation: p.recommendation || 'WATCH',
    flipMargin: p.flipMargin ?? 0,
    dropChance: p.dropChance ?? null,
    savedAt: serverTimestamp(),
  })
}

export async function removeSaved(uid, productId) {
  return deleteDoc(doc(db, 'users', uid, 'saved', productId))
}

/* ---------------- dashboard: daily opportunity stats ---------------- */

export async function getDailyStats() {
  try {
    const s = await getDoc(doc(db, 'snapshots', 'dailyStats'))
    return s.exists() && Array.isArray(s.data().series) ? s.data().series : []
  } catch {
    return []
  }
}

/**
 * Build a CSV string from the current product set.
 */
export async function buildProductsCsv() {
  const rows = await getProducts()
  const headers = ['ID', 'Name', 'Source', 'Price', 'Margin %', 'Rating', 'URL']
  const lines = rows.map((p) =>
    [p.id, p.name, p.source, p.currentPrice, p.marginPercentage, p.rating, p.sourceUrl]
      .map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`)
      .join(',')
  )
  return [headers.join(','), ...lines].join('\n')
}
