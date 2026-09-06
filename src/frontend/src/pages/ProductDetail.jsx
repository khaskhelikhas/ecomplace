import { useState, useEffect, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Link } from 'react-router-dom'
import { getProduct, createAlert, addSourcing, countAlerts, countSourcing } from '../lib/data'
import { withUserAffiliate, hasUserAffiliate } from '../lib/userAffiliate'
import { limitOf, planOf, can } from '../lib/plans'
import SignalBadge from '../components/SignalBadge'
import ProfitCalc from '../components/ProfitCalc'
import { track } from '../lib/firebase'

const PriceChart = lazy(() => import('../components/PriceChart'))

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [af, setAf] = useState({ alertType: 'price', targetPrice: '', targetMargin: '' })
  const [msg, setMsg] = useState(null)
  const [sourced, setSourced] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        setP(await getProduct(id))
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    })()
  }, [id])

  const submitAlert = async (e) => {
    e.preventDefault()
    if (!user?.id) return setMsg({ t: 'err', m: 'Please sign in again.' })
    if (!user.emailVerified)
      return setMsg({ t: 'err', m: 'Verify your email first so we can send alerts.' })
    const lim = limitOf(user, 'alerts')
    if (lim !== Infinity && (await countAlerts(user.id)) >= lim) {
      return setMsg({
        t: 'err',
        m: `${planOf(user).name} plan is capped at ${lim} alerts. Upgrade for unlimited.`,
      })
    }
    try {
      await createAlert({
        userId: user.id,
        productId: id,
        alertType: af.alertType,
        targetPrice: af.alertType === 'price' ? Number(af.targetPrice) : null,
        targetMargin: af.alertType === 'margin' ? Number(af.targetMargin) : null,
      })
      setMsg({ t: 'ok', m: 'Alert created — you’ll be emailed when it hits.' })
    } catch (err) {
      console.error(err)
      setMsg({ t: 'err', m: 'Could not create alert.' })
    }
  }

  if (loading)
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-40 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="skeleton h-96 lg:col-span-2" />
          <div className="skeleton h-72" />
        </div>
      </div>
    )
  if (!p) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-ink-500">Deal not found.</div>

  const disc = p.marginPercentage || 0
  const affiliateOk = can(user, 'affiliateTags')
  const outUrl = affiliateOk ? withUserAffiliate(p.sourceUrl, p.source, user || {}) : p.sourceUrl

  const addToSourcing = async () => {
    if (!user?.id) return setMsg({ t: 'err', m: 'Please sign in again.' })
    const lim = limitOf(user, 'sourcing')
    if (lim !== Infinity && (await countSourcing(user.id)) >= lim) {
      return setMsg({
        t: 'err',
        m: `${planOf(user).name} plan is capped at ${lim} sourcing items. Upgrade for unlimited.`,
      })
    }
    try {
      await addSourcing(user.id, {
        productId: id,
        name: p.name,
        source: p.source,
        sourceUrl: p.sourceUrl,
        dealPrice: p.currentPrice,
      })
      setSourced(true)
    } catch (e) {
      console.error(e)
      setMsg({ t: 'err', m: 'Could not add to sourcing list.' })
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <button onClick={() => navigate('/products')} className="text-sm text-brand-600 font-medium mb-4">
        ← All deals
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* main */}
        <div className="lg:col-span-2 card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-slate-100 text-slate-600 capitalize">
              {p.source?.replace(/-/g, ' ')}
            </span>
            <SignalBadge rec={p.recommendation} />
          </div>

          {p.imageUrl && (
            <img
              src={p.imageUrl}
              alt=""
              className="w-full max-h-64 object-contain rounded-lg bg-slate-50 mb-5"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}

          <h1 className="text-xl sm:text-2xl font-bold leading-snug">{p.name}</h1>

          <div className="flex items-end gap-3 mt-4">
            <span className="text-3xl font-bold">${p.currentPrice}</span>
            {p.previousPrice > p.currentPrice && (
              <span className="text-ink-400 line-through">${p.previousPrice}</span>
            )}
            {disc > 0 && <span className="chip bg-emerald-100 text-emerald-700 mb-1">−{disc}% off</span>}
          </div>

          {p.recommendation && (
            <div className="mt-5 rounded-lg border border-slate-200 p-4 bg-slate-50/60">
              <div className="flex items-center gap-2 mb-2">
                <SignalBadge rec={p.recommendation} />
                <span className="text-sm text-ink-700">{p.reason}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-3">
                <Mini label="Trend" value={cap(p.trend)} />
                <Mini label="May drop" value={`${p.dropChance ?? '—'}%`} />
                <Mini
                  label="Ends in"
                  value={p.expiresInHours != null ? `${p.expiresInHours} h` : '—'}
                />
                <Mini
                  label="Est. margin"
                  value={p.flipMargin > 0 ? `~$${Math.round(p.flipMargin)}` : '—'}
                  accent="text-emerald-600"
                />
              </div>
              <p className="text-[11px] text-ink-400 mt-3">
                Heuristic estimate from limited price data — a nudge, not financial advice.
              </p>
            </div>
          )}

          <div className="mt-6">
            <ProfitCalc
              dealPrice={p.currentPrice}
              suggestedSell={p.previousPrice}
              category={p.category}
            />
          </div>

          <div className="mt-6">
            <h2 className="font-bold mb-3">Price history</h2>
            <Suspense fallback={<div className="skeleton h-[200px]" />}>
              <PriceChart history={p.priceHistory} />
            </Suspense>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {p.sourceUrl && (
              <a
                href={outUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track('deal_click', {
                    source: p.source,
                    price: p.currentPrice,
                    recommendation: p.recommendation,
                  })
                }
                className="btn-primary flex-1"
              >
                View deal at {p.source?.replace(/-/g, ' ')} ↗
              </a>
            )}
            <button onClick={addToSourcing} disabled={sourced} className="btn-ghost flex-1">
              {sourced ? '✓ In sourcing list' : '+ Add to sourcing'}
            </button>
          </div>

          {affiliateOk && hasUserAffiliate(user || {}) && (
            <p className="text-[11px] text-emerald-600 mt-2">
              This link carries your affiliate id — purchases through it pay you.
            </p>
          )}
        </div>

        {/* alert */}
        <div className="card p-5 sm:p-6 h-fit lg:sticky lg:top-20">
          <h2 className="font-bold mb-1">Create a price alert</h2>
          <p className="text-xs text-ink-500 mb-4">Email me when this deal gets better.</p>

          {msg && (
            <div
              className={`text-sm px-3 py-2 rounded-lg mb-3 ${
                msg.t === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {msg.m}
              {msg.m?.includes('Upgrade') && (
                <>
                  {' '}
                  <Link to="/upgrade" className="underline font-semibold">
                    See plans
                  </Link>
                </>
              )}
            </div>
          )}

          <form onSubmit={submitAlert} className="space-y-3">
            <div>
              <label className="label">Condition</label>
              <select
                className="field"
                value={af.alertType}
                onChange={(e) => setAf({ ...af, alertType: e.target.value })}
              >
                <option value="price">Price drops to…</option>
                <option value="margin">Discount reaches…</option>
              </select>
            </div>
            {af.alertType === 'price' ? (
              <div>
                <label className="label">Target price ($)</label>
                <input
                  className="field"
                  type="number"
                  step="0.01"
                  value={af.targetPrice}
                  onChange={(e) => setAf({ ...af, targetPrice: e.target.value })}
                  required
                />
              </div>
            ) : (
              <div>
                <label className="label">Target discount (%)</label>
                <input
                  className="field"
                  type="number"
                  value={af.targetMargin}
                  onChange={(e) => setAf({ ...af, targetMargin: e.target.value })}
                  required
                />
              </div>
            )}
            <button className="btn-primary w-full">Create alert</button>
          </form>
        </div>
      </div>
    </div>
  )
}

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1)

function Mini({ label, value, accent = 'text-ink-900' }) {
  return (
    <div>
      <p className="text-ink-400 text-xs">{label}</p>
      <p className={`font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
