import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, buildProductsCsv } from '../lib/data'
import { useAuthStore } from '../store/authStore'
import { can } from '../lib/plans'
import SignalBadge from '../components/SignalBadge'

const REC_ORDER = { 'BUY NOW': 0, WATCH: 1, SKIP: 2 }

export default function ProductList() {
  const { user } = useAuthStore()
  const canCsv = can(user, 'csvExport')
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ search: '', source: 'all', signal: 'all', minDisc: 0 })

  useEffect(() => {
    ;(async () => {
      try {
        setAll(await getProducts())
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    })()
  }, [])

  const sources = useMemo(
    () => [...new Set(all.map((p) => p.source).filter(Boolean))].sort(),
    [all]
  )

  const rows = useMemo(() => {
    let r = all
    if (f.search.trim()) {
      const s = f.search.toLowerCase()
      r = r.filter((p) => p.name?.toLowerCase().includes(s))
    }
    if (f.source !== 'all') r = r.filter((p) => p.source === f.source)
    if (f.signal !== 'all') r = r.filter((p) => (p.recommendation || 'WATCH') === f.signal)
    if (Number(f.minDisc) > 0) r = r.filter((p) => (p.marginPercentage || 0) >= Number(f.minDisc))
    return [...r].sort(
      (a, b) =>
        (REC_ORDER[a.recommendation] ?? 1) - (REC_ORDER[b.recommendation] ?? 1) ||
        (b.dealScore || 0) - (a.dealScore || 0)
    )
  }, [all, f])

  const pretty = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const exportCsv = async () => {
    const csv = await buildProductsCsv()
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'ecomplace-deals.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Deals</h1>
          <p className="text-ink-500 text-sm">
            {loading ? 'Loading…' : `${rows.length} of ${all.length} deals`}
          </p>
        </div>
        {canCsv ? (
          <button onClick={exportCsv} className="btn-ghost text-sm">
            ⬇ Export CSV
          </button>
        ) : (
          <Link to="/upgrade" className="btn-ghost text-sm opacity-70">
            ⬇ Export CSV · Pro
          </Link>
        )}
      </div>

      {/* filters */}
      <div className="card p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 md:col-span-1">
          <label className="label">Search</label>
          <input
            className="field"
            placeholder="Air duster, LEGO…"
            value={f.search}
            onChange={(e) => setF({ ...f, search: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Retailer</label>
          <select className="field" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
            <option value="all">All</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {pretty(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Signal</label>
          <select className="field" value={f.signal} onChange={(e) => setF({ ...f, signal: e.target.value })}>
            <option value="all">All</option>
            <option>BUY NOW</option>
            <option>WATCH</option>
            <option>SKIP</option>
          </select>
        </div>
        <div>
          <label className="label">Min discount %</label>
          <input
            className="field"
            type="number"
            min="0"
            max="100"
            value={f.minDisc}
            onChange={(e) => setF({ ...f, minDisc: e.target.value })}
          />
        </div>
      </div>

      {/* grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-44" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">No deals match these filters.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <DealCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function DealCard({ p }) {
  const disc = p.marginPercentage || 0
  return (
    <Link
      to={`/products/${p.id}`}
      className="card p-4 flex flex-col hover:shadow-pop hover:border-brand-200 transition group"
    >
      <div className="relative -mx-4 -mt-4 mb-3 h-40 bg-slate-50 rounded-t-xl overflow-hidden">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-contain p-3"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-3xl text-slate-300">
            🏷️
          </div>
        )}
        <span className="absolute top-2 left-2 chip bg-white/90 backdrop-blur text-slate-600 capitalize shadow-sm">
          {p.source?.replace(/-/g, ' ')}
        </span>
        <span className="absolute top-2 right-2">
          <SignalBadge rec={p.recommendation} />
        </span>
      </div>

      <p className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand-700 min-h-[2.5rem]">
        {p.name}
      </p>

      <div className="flex items-end gap-2 mt-3">
        <span className="text-xl font-bold">${p.currentPrice}</span>
        {disc > 0 && (
          <span className="chip bg-emerald-100 text-emerald-700 mb-0.5">−{disc}%</span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-ink-500">
        <span>
          {p.dropChance != null ? `${p.dropChance}% may drop` : ''}
        </span>
        <span className="text-emerald-600 font-semibold">
          {p.flipMargin > 0 ? `~$${Math.round(p.flipMargin)} margin` : ''}
        </span>
      </div>
    </Link>
  )
}
