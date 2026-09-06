import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSavedStore } from '../store/savedStore'
import { getSaved } from '../lib/data'
import SignalBadge from '../components/SignalBadge'
import SaveButton from '../components/SaveButton'

export default function Saved() {
  const { user } = useAuthStore()
  const savedIds = useSavedStore((s) => s.ids)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return setLoading(false)
    getSaved(user.id)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  // Drop rows the user un-stars while on this page.
  const rows = items.filter((it) => savedIds.has(it.productId || it.id))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">Saved deals</h1>
      <p className="text-ink-500 text-sm mb-5">
        Your watchlist — quick bookmarks, no alert required.
      </p>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-44" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-500">Nothing saved yet.</p>
          <Link to="/products" className="text-brand-600 font-medium text-sm">
            Browse deals — tap ☆ to save →
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div
              key={p.id}
              className="card p-4 flex flex-col hover:shadow-pop hover:border-brand-200 transition group relative"
            >
              <div className="relative -mx-4 -mt-4 mb-3 h-40 bg-slate-50 rounded-t-xl overflow-hidden">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-contain p-3"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
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
                <SaveButton
                  product={{ id: p.productId || p.id, ...p }}
                  size="sm"
                  className="absolute bottom-2 right-2"
                />
              </div>

              <Link
                to={`/products/${p.productId || p.id}`}
                className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand-700 min-h-[2.5rem]"
              >
                {p.name}
              </Link>

              <div className="flex items-end gap-2 mt-3">
                <span className="text-xl font-bold">${p.currentPrice}</span>
                {p.marginPercentage > 0 && (
                  <span className="chip bg-emerald-100 text-emerald-700 mb-0.5">
                    −{p.marginPercentage}%
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  to={`/products/${p.productId || p.id}`}
                  className="text-brand-600 font-medium"
                >
                  Details →
                </Link>
                {p.sourceUrl && (
                  <a
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-500 hover:text-brand-600"
                  >
                    View deal ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
