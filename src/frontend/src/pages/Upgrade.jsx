import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { PLANS, PLAN_ORDER, FOUNDING, planOf } from '../lib/plans'

export default function Upgrade() {
  const { user } = useAuthStore()
  const current = user?.subscriptionPlan || 'free'
  const [annual, setAnnual] = useState(false)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center">Plans</h1>
      <p className="text-ink-500 text-sm text-center mt-1">
        You are on the <b className="capitalize">{planOf(user).name}</b> plan. Cancel anytime.
      </p>

      {FOUNDING.active && (
        <p className="text-center text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 max-w-xl mx-auto mt-4">
          🚀 {FOUNDING.copy}
        </p>
      )}

      <div className="flex items-center justify-center gap-3 mt-6 mb-8 text-sm">
        <span className={!annual ? 'font-semibold' : 'text-ink-400'}>Monthly</span>
        <button
          onClick={() => setAnnual((v) => !v)}
          className={`w-12 h-6 rounded-full p-0.5 transition ${annual ? 'bg-brand-600' : 'bg-slate-300'}`}
        >
          <span
            className={`block w-5 h-5 bg-white rounded-full transition ${annual ? 'translate-x-6' : ''}`}
          />
        </button>
        <span className={annual ? 'font-semibold' : 'text-ink-400'}>
          Annual <span className="text-emerald-600">· 2 months free</span>
        </span>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((key) => {
          const p = PLANS[key]
          const isCurrent = key === current
          const priceNum = annual ? p.priceYear : p.price
          const priceLabel =
            key === 'free' ? '$0' : annual ? `$${p.priceYear} / yr` : `$${p.price} / mo`
          const url = annual ? p.checkoutUrlYear : p.checkoutUrl
          const ready = url && !url.includes('REPLACE')

          return (
            <div
              key={key}
              className={`card p-6 flex flex-col ${
                key === 'pro' ? 'border-brand-300 ring-1 ring-brand-200' : ''
              }`}
            >
              {key === 'pro' && (
                <span className="chip bg-brand-100 text-brand-700 self-start mb-2">Most popular</span>
              )}
              <h2 className="font-bold text-lg">{p.name}</h2>
              <p className="text-2xl font-extrabold mt-1">{priceLabel}</p>
              <p className="text-sm text-ink-500 mt-2 min-h-[3.5rem]">{p.blurb}</p>

              <ul className="text-sm space-y-1.5 mt-4 mb-6">
                <Li ok>
                  {p.limits.alerts === Infinity ? 'Unlimited' : p.limits.alerts} price alerts
                </Li>
                <Li ok>
                  {p.limits.sourcing === Infinity ? 'Unlimited' : p.limits.sourcing} sourcing items
                </Li>
                <Li ok={p.features.csvExport}>CSV export</Li>
                <Li ok={p.features.affiliateTags}>Your own affiliate ids</Li>
                <Li ok={p.features.asinAnalyzer}>ASIN / URL analyzer</Li>
                <Li ok={p.features.bulkAnalysis}>Bulk CSV analysis</Li>
                <Li ok={p.features.api}>API access</Li>
                {p.features.teamSeats && <Li ok>{p.features.teamSeats} team seats</Li>}
              </ul>

              <div className="mt-auto">
                {isCurrent ? (
                  <div className="btn-ghost w-full cursor-default">Current plan</div>
                ) : key === 'free' ? (
                  <div className="btn-ghost w-full cursor-default text-ink-400">—</div>
                ) : (
                  <a
                    href={
                      ready
                        ? `${url}?client_reference_id=${user?.id}&prefilled_email=${encodeURIComponent(
                            user?.email || ''
                          )}`
                        : undefined
                    }
                    className={`btn-primary w-full ${!ready ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {ready ? `Choose ${p.name}` : 'Coming soon'}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-ink-400 text-center mt-8">
        Payments handled by Stripe. Your plan unlocks automatically once payment
        is confirmed (see PRICING.md for setup).
      </p>
    </div>
  )
}

function Li({ ok, children }) {
  return (
    <li className={ok ? 'text-ink-700' : 'text-ink-300 line-through'}>
      {ok ? '✓ ' : '✕ '}
      {children}
    </li>
  )
}
