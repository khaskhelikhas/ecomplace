import { useAuthStore } from '../store/authStore'
import { PLANS, planOf } from '../lib/plans'

export default function Upgrade() {
  const { user } = useAuthStore()
  const current = user?.subscriptionPlan || 'free'

  const order = ['free', 'pro', 'business']

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center">Plans</h1>
      <p className="text-ink-500 text-sm text-center mt-1 mb-8">
        You are on the <b className="capitalize">{planOf(user).name}</b> plan. Cancel anytime.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        {order.map((key) => {
          const p = PLANS[key]
          const isCurrent = key === current
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
              <p className="text-2xl font-extrabold mt-1">{p.priceLabel}</p>
              <p className="text-sm text-ink-500 mt-2 min-h-[3rem]">{p.blurb}</p>

              <ul className="text-sm space-y-1.5 mt-4 mb-6">
                <Li ok>
                  {p.limits.alerts === Infinity ? 'Unlimited' : p.limits.alerts} price alerts
                </Li>
                <Li ok>
                  {p.limits.sourcing === Infinity ? 'Unlimited' : p.limits.sourcing} sourcing items
                </Li>
                <Li ok={p.features.csvExport}>CSV export</Li>
                <Li ok={p.features.affiliateTags}>Your own affiliate ids</Li>
                <Li ok={p.features.categoryAlerts}>Category alerts</Li>
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
                      p.checkoutUrl && !p.checkoutUrl.includes('REPLACE')
                        ? `${p.checkoutUrl}?client_reference_id=${user?.id}&prefilled_email=${encodeURIComponent(
                            user?.email || ''
                          )}`
                        : undefined
                    }
                    className={`btn-primary w-full ${
                      !p.checkoutUrl || p.checkoutUrl.includes('REPLACE') ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {p.checkoutUrl && !p.checkoutUrl.includes('REPLACE')
                      ? `Upgrade to ${p.name}`
                      : 'Coming soon'}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-ink-400 text-center mt-8">
        Payments are handled by Stripe. Your plan unlocks automatically once
        payment is confirmed (see PRICING.md for setup).
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
