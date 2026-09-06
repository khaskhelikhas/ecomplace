import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getSourcing, updateSourcing, removeSourcing } from '../lib/data'

export default function Sourcing() {
  const { user } = useAuthStore()
  const uid = user?.id
  const feePct = user?.defaultFeePct ?? 15
  const shipDefault = user?.defaultShipping ?? 0

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return setLoading(false)
    ;(async () => {
      try {
        setItems(await getSourcing(uid))
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    })()
  }, [uid])

  const patch = async (id, data) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...data } : x)))
    try {
      await updateSourcing(uid, id, data)
    } catch (e) {
      console.error(e)
    }
  }

  const remove = async (id) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
    await removeSourcing(uid, id)
  }

  const rows = useMemo(
    () =>
      items.map((it) => {
        const cost = Number(it.dealPrice) || 0
        const qty = Math.max(1, Number(it.qty) || 1)
        const sell = Number(it.sellPrice) || Math.round(cost * 1.6)
        const fee = sell * (feePct / 100)
        const perUnit = sell - cost - fee - shipDefault
        return {
          ...it,
          qty,
          sell,
          outlay: (cost + shipDefault) * qty,
          profit: perUnit * qty,
          roi: cost ? (perUnit / cost) * 100 : 0,
        }
      }),
    [items, feePct, shipDefault]
  )

  const totals = rows.reduce(
    (a, r) => ({ outlay: a.outlay + r.outlay, profit: a.profit + r.profit }),
    { outlay: 0, profit: 0 }
  )

  const exportCsv = () => {
    const head = ['Product', 'Source', 'Deal price', 'Qty', 'Sell price', 'Outlay', 'Projected profit', 'ROI %', 'URL']
    const lines = rows.map((r) =>
      [r.name, r.source, r.dealPrice, r.qty, r.sell, r.outlay.toFixed(2), r.profit.toFixed(2), r.roi.toFixed(0), r.sourceUrl]
        .map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`)
        .join(',')
    )
    const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'sourcing-list.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Sourcing list</h1>
          <p className="text-ink-500 text-sm">
            Deals you plan to buy and flip. Uses your {feePct}% fee + ${shipDefault} shipping from{' '}
            <Link to="/settings" className="text-brand-600">settings</Link>.
          </p>
        </div>
        {rows.length > 0 && (
          <button onClick={exportCsv} className="btn-ghost text-sm">⬇ Export CSV</button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-500">Nothing here yet.</p>
          <Link to="/products" className="text-brand-600 font-medium text-sm">Browse deals → add to sourcing</Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div className="card p-4">
              <p className="text-xs text-ink-500">Total outlay</p>
              <p className="text-2xl font-bold">${totals.outlay.toFixed(0)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-500">Projected profit</p>
              <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${totals.profit.toFixed(0)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-ink-500">Blended ROI</p>
              <p className="text-2xl font-bold">
                {totals.outlay ? ((totals.profit / totals.outlay) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className={`card p-4 ${r.purchased ? 'border-emerald-200 bg-emerald-50/40' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/products/${r.productId}`} className="font-semibold text-sm hover:text-brand-700 line-clamp-2">
                    {r.purchased && <span className="chip bg-emerald-100 text-emerald-700 mr-1">bought</span>}
                    {r.name}
                  </Link>
                  <button onClick={() => remove(r.id)} className="text-xs text-rose-600 shrink-0">✕</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-sm items-end">
                  <Cell label="Deal price"><span className="font-semibold">${r.dealPrice}</span></Cell>
                  <Cell label="Qty">
                    <input
                      className="field py-1.5"
                      type="number"
                      min="1"
                      value={r.qty}
                      onChange={(e) => patch(r.id, { qty: Number(e.target.value) || 1 })}
                    />
                  </Cell>
                  <Cell label={r.purchased ? 'Actual sell' : 'Sell price'}>
                    <input
                      className="field py-1.5"
                      type="number"
                      value={r.sellPrice ?? r.sell}
                      onChange={(e) => patch(r.id, { sellPrice: Number(e.target.value) || 0 })}
                    />
                  </Cell>
                  <Cell label={r.purchased ? 'Actual profit' : 'Est. profit'}>
                    <span className={`font-bold ${r.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ${r.profit.toFixed(0)}
                    </span>
                  </Cell>
                  <Cell label="ROI">
                    <span className="font-semibold">{r.roi.toFixed(0)}%</span>
                  </Cell>
                </div>
                <button
                  onClick={() => patch(r.id, { purchased: !r.purchased })}
                  className={`mt-3 text-xs px-3 py-1.5 rounded-lg font-medium ${
                    r.purchased
                      ? 'bg-white border border-emerald-300 text-emerald-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.purchased ? '✓ Marked as bought' : 'Mark as bought'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Cell({ label, children }) {
  return (
    <div>
      <p className="text-ink-400 text-xs mb-1">{label}</p>
      {children}
    </div>
  )
}
