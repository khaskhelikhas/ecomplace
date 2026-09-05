import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
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

/**
 * Fetch products, newest fetch first, then filter client-side.
 * Product counts here are small (tens to low hundreds) so this is fine.
 */
export async function getProducts(filters = {}) {
  const snap = await getDocs(
    query(collection(db, 'products'), orderBy('marginPercentage', 'desc'), fbLimit(500))
  )

  let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

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

  // Attach current product info
  return Promise.all(
    alerts.map(async (a) => {
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

export async function createAlert({ userId, productId, alertType, targetPrice, targetMargin }) {
  return addDoc(collection(db, 'alerts'), {
    userId,
    productId,
    alertType: alertType || 'price',
    targetPrice: targetPrice ?? null,
    targetMargin: targetMargin ?? null,
    isTriggered: false,
    createdAt: serverTimestamp(),
  })
}

export async function deleteAlert(id) {
  return deleteDoc(doc(db, 'alerts', id))
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
