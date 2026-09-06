import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../lib/data'
import SignalBadge from '../components/SignalBadge'
import SaveButton from '../components/SaveButton'

/**
 * Ranks deals by resale opportunity, not headline discount:
 *   potential = estimated flip profit ($) weighted by how likely the price
 *   is to hold / keep falling (drop-chance).
 */
function potential(p) {
  const profit = Number(p.flipMargin) || 0
  const dc = p.dropChance == null ? 0.5 : Number(p.dropChance) / 100
  return profit * (0.5 + 0.5 * dc)
}

export default function TopFlips() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [minProfit, setMinProfit] = useState(0)

  useEffect(() => {
    getProducts()
      .then(setAll)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    return all
      .map((p) => {
        const profit = Number(p.flipMargin) || 0
        const roi = p.currentPrice > 0 ? (profit / p.currentPrice) * 100 : 0
        return { ...p, profit, roi, score: potential(p) }
      })
      .filter((p) => p.profit > Number(minProfit))
      .sort((a, b) => b.score - a.score)
  }, [all, minProfit])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold">Top flips</h1>
        <label className="text-sm text-ink-500 flex items-center gap-2">
          Min est. profit&nbsp;$
          <input
            type="number"
            min="0"
            value={minProfit}
            onChange={(e) => setMinProfit(e.target.value)}
            className="field py-1 w-20"
          />
        </label>
      </div>
      <p className="text-ink-500 text-sm mb-5">
        Ranked by estimated resale profit, weighted by how likely the price is
        to hold. Estimates, not advice — check the deal and the calculator.
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          No deals with a positive flip estimate right now — check back after the
          next refresh.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p, i) => (
            <div key={p.id} className="card p-4 flex items-start gap-4">
              <div className="text-lg font-bold text-ink-300 w-6 shrink-0 text-center pt-1">
                {i + 1}
              </div>

              <Link
                to={`/products/${p.id}`}
                className="w-16 h-16 shrink-0 rounded-lg bg-slate-50 grid place-items-center overflow-hidden"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <span className="text-xl text-slate-300">🏷️</span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/products/${p.id}`}
                    className="font-semibold text-sm leading-snug line-clamp-2 hover:text-brand-700"
                  >
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SignalBadge rec={p.recommendation} />
                    <SaveButton product={p} size="sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-sm">
                  <Stat label="Buy now" value={`$${p.currentPrice}`} />
                  <Stat
                    label="Est. resale"
                    value={p.previousPrice > p.currentPrice ? `~$${Math.round(p.previousPrice)}` : '—'}
                  />
                  <Stat
                    label="Est. profit"
                    value={`~$${Math.round(p.profit)}`}
                    accent="text-emerald-600"
                  />
                  <Stat label="Est. ROI" value={`${p.roi.toFixed(0)}%`} />
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
                  {p.dropChance != null && <span>{p.dropChance}% may drop further</span>}
                  <span className="capitalize">{p.category}</span>
                  {p.sourceUrl && (
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 font-medium ml-auto"
                    >
                      View deal ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent = 'text-ink-900' }) {
  return (
    <div>
      <p className="text-ink-400 text-[11px]">{label}</p>
      <p className={`font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
