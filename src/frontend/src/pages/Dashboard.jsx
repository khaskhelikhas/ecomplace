import { useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getProducts } from '../lib/data'
import SignalBadge from '../components/SignalBadge'

const ProfitTrend = lazy(() => import('../components/ProfitTrend'))

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const products = await getProducts()
        if (!products.length) {
          setStats({ totalProducts: 0, avgDiscount: 0, buySignals: [], topDeal: null })
        } else {
          const totalDisc = products.reduce((s, p) => s + (p.marginPercentage || 0), 0)
          const buySignals = products
            .filter((p) => p.recommendation === 'BUY NOW')
            .sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0))
            .slice(0, 6)
          const topDeal = [...products].sort(
            (a, b) => (b.marginPercentage || 0) - (a.marginPercentage || 0)
          )[0]
          setStats({
            totalProducts: products.length,
            avgDiscount: (totalDisc / products.length).toFixed(1),
            buySignals,
            topDeal,
          })
        }
        setLoading(false)
      } catch (e) {
        console.error('dashboard', e)
        setError('Could not load deals. They may still be loading — try again in a minute.')
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <Shell><SkeletonDash /></Shell>

  return (
    <Shell>
      {/* hero */}
      <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white p-6 sm:p-8 shadow-pop mb-6">
        <p className="text-white/70 text-sm">Welcome back</p>
        <h1 className="text-2xl sm:text-3xl font-bold">{user?.fullName || user?.email}</h1>
        <p className="text-white/80 mt-2 max-w-lg text-sm">
          {stats.totalProducts} live deals tracked · refreshed every 20 minutes · each
          scored buy / watch / skip.
        </p>
      </div>

      {error && (
        <div className="card p-4 border-amber-200 bg-amber-50 text-amber-800 text-sm mb-6">
          {error}
        </div>
      )}

      {(!user?.subscriptionPlan || user.subscriptionPlan === 'free') && (
        <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600">
            <b>Free plan.</b> Starter ($19/mo) unlocks unlimited sourcing, CSV
            export, category alerts and your own affiliate links.
          </p>
          <Link to="/upgrade" className="btn-primary text-sm shrink-0">
            See plans →
          </Link>
        </div>
      )}

      {user?.subscriptionPlan === 'starter' && (
        <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600">
            <b>Starter plan.</b> Pro ($49/mo) adds the ASIN analyzer, bulk CSV
            analysis and unlimited alerts.
          </p>
          <Link to="/upgrade" className="btn-primary text-sm shrink-0">
            Compare plans →
          </Link>
        </div>
      )}

      {user?.subscriptionPlan === 'pro' && (
        <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600">
            <b>Pro plan.</b> Agency ($99/mo) adds the JSON deals API, 5 team
            seats, white-label and priority support.
          </p>
          <Link to="/upgrade" className="btn-primary text-sm shrink-0">
            Compare plans →
          </Link>
        </div>
      )}

      {/* stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Live deals" value={stats.totalProducts} />
        <Stat label="Avg discount" value={`${stats.avgDiscount}%`} accent="text-emerald-600" />
        <Stat label="Buy signals" value={stats.buySignals.length} accent="text-brand-600" />
        <Stat label="Plan" value={user?.subscriptionPlan} capitalize />
      </div>

      <Suspense fallback={<div className="skeleton h-72 rounded-xl mb-8" />}>
        <ProfitTrend />
      </Suspense>

      {/* buy signals */}
      <section className="card p-5 sm:p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">🎯 Top buy signals</h2>
          <span className="text-xs text-ink-400">heuristic · not advice</span>
        </div>

        {stats.buySignals.length === 0 ? (
          <p className="text-ink-500 text-sm py-6 text-center">
            No strong buy signals right now.{' '}
            <Link to="/products" className="text-brand-600 font-medium">
              Browse all deals →
            </Link>
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {stats.buySignals.map((p) => (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                className="group border border-slate-200 rounded-lg p-4 hover:border-brand-300 hover:shadow-card transition flex gap-3"
              >
                <div className="w-16 h-16 shrink-0 rounded-lg bg-slate-50 grid place-items-center overflow-hidden">
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
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand-700">
                      {p.name}
                    </p>
                    <SignalBadge rec={p.recommendation} />
                  </div>
                  <p className="text-xs text-ink-500 mt-1 line-clamp-1">{p.reason}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="font-bold">${p.currentPrice}</span>
                    <span className="text-emerald-600 font-medium">{p.marginPercentage}% off</span>
                    {p.flipMargin > 0 && (
                      <span className="text-ink-400">~${Math.round(p.flipMargin)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {stats.topDeal && (
        <Link to={`/products/${stats.topDeal.id}`} className="card p-5 sm:p-6 flex items-center gap-4 hover:shadow-card">
          <div className="grid place-items-center w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 text-xl shrink-0">
            %
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-500">Biggest discount right now</p>
            <p className="font-semibold truncate">{stats.topDeal.name}</p>
            <p className="text-sm text-ink-500">
              ${stats.topDeal.currentPrice} ·{' '}
              <span className="text-emerald-600 font-semibold">
                {stats.topDeal.marginPercentage}% off
              </span>{' '}
              · {stats.topDeal.source}
            </p>
          </div>
        </Link>
      )}
    </Shell>
  )
}

function Shell({ children }) {
  return <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">{children}</div>
}

function Stat({ label, value, accent = 'text-ink-900', capitalize }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs sm:text-sm text-ink-500">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${accent} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function SkeletonDash() {
  return (
    <>
      <div className="skeleton h-32 rounded-xl mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-xl" />
    </>
  )
}
