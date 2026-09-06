import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { PLANS, PLAN_ORDER, FOUNDING, PAYMENT, planOf } from '../lib/plans'
import { createPaymentRequest, myPaymentRequests } from '../lib/data'
import { track } from '../lib/firebase'

export default function Upgrade() {
  const { user } = useAuthStore()
  const current = user?.subscriptionPlan || 'free'
  const [annual, setAnnual] = useState(false)
  const [chosen, setChosen] = useState(null) // plan key when requesting manually
  const [reqs, setReqs] = useState([])

  useEffect(() => {
    if (user?.id) myPaymentRequests(user.id).then(setReqs).catch(() => {})
  }, [user?.id])

  const pending = reqs.find((r) => r.status === 'pending')

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

      {pending && (
        <p className="text-center text-sm bg-brand-50 border border-brand-200 text-brand-700 rounded-lg px-4 py-2 max-w-xl mx-auto mt-3">
          ⏳ Your request for <b className="capitalize">{pending.plan}</b> ({pending.cycle}) is
          pending — it activates once we confirm payment.
        </p>
      )}

      <div className="flex items-center justify-center gap-3 mt-6 mb-8 text-sm">
        <span className={!annual ? 'font-semibold' : 'text-ink-400'}>Monthly</span>
        <button
          onClick={() => setAnnual((v) => !v)}
          className={`w-12 h-6 rounded-full p-0.5 transition ${annual ? 'bg-brand-600' : 'bg-slate-300'}`}
        >
          <span className={`block w-5 h-5 bg-white rounded-full transition ${annual ? 'translate-x-6' : ''}`} />
        </button>
        <span className={annual ? 'font-semibold' : 'text-ink-400'}>
          Annual <span className="text-emerald-600">· 2 months free</span>
        </span>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((key) => {
          const p = PLANS[key]
          const isCurrent = key === current
          const priceLabel =
            key === 'free' ? '$0' : annual ? `$${p.priceYear} / yr` : `$${p.price} / mo`
          const baseUrl = annual ? p.checkoutUrlYear : p.checkoutUrl
          const hostedReady =
            PAYMENT.hostedCheckout && baseUrl && !baseUrl.includes('REPLACE') && !baseUrl.includes('YOURSTORE')
          // Lemon Squeezy: pass our uid + email so the webhook can match the user.
          const url = hostedReady
            ? `${baseUrl}?checkout[custom][uid]=${user?.id}&checkout[email]=${encodeURIComponent(
                user?.email || ''
              )}`
            : baseUrl

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
                <Li ok>{p.limits.alerts === Infinity ? 'Unlimited' : p.limits.alerts} price alerts</Li>
                <Li ok>{p.limits.sourcing === Infinity ? 'Unlimited' : p.limits.sourcing} sourcing items</Li>
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
                ) : hostedReady ? (
                  <>
                    <a href={url} className="btn-primary w-full">
                      Pay by card · {p.name}
                    </a>
                    <button
                      onClick={() => setChosen(key)}
                      className="text-xs text-ink-400 hover:text-ink-600 w-full mt-2"
                    >
                      or request another payment method
                    </button>
                  </>
                ) : (
                  <button onClick={() => setChosen(key)} className="btn-primary w-full">
                    Choose {p.name}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {chosen && (
        <RequestPanel
          planKey={chosen}
          cycle={annual ? 'annual' : 'monthly'}
          user={user}
          onClose={() => setChosen(null)}
          onDone={() => {
            setChosen(null)
            if (user?.id) myPaymentRequests(user.id).then(setReqs)
          }}
        />
      )}

      <p className="text-xs text-ink-400 text-center mt-8">
        {PAYMENT.hostedCheckout
          ? 'Payments handled by our checkout provider; your plan unlocks automatically.'
          : 'Manual activation: submit a request, pay by any listed method, reply with the receipt.'}
      </p>
    </div>
  )
}

function RequestPanel({ planKey, cycle, user, onClose, onDone }) {
  const p = PLANS[planKey]
  const price = cycle === 'annual' ? p.priceYear : p.price
  const [method, setMethod] = useState(PAYMENT.methods[0]?.label || '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await createPaymentRequest({
        userId: user.id,
        email: user.email,
        plan: planKey,
        cycle,
        method,
        note,
      })
      track('upgrade_request', { plan: planKey, cycle })
      setSent(true)
    } catch (e) {
      console.error(e)
      alert('Could not submit the request.')
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50" onClick={onClose}>
      <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h3 className="font-bold text-lg">Request received ✅</h3>
            <p className="text-sm text-ink-600 mt-2">
              Pay <b>${price}</b> for <b className="capitalize">{p.name}</b> ({cycle}) by your
              chosen method, then reply to our email with the receipt. We activate within 24h.
            </p>
            <button onClick={onDone} className="btn-primary w-full mt-5">
              Done
            </button>
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg">
              Upgrade to {p.name} — ${price}/{cycle === 'annual' ? 'yr' : 'mo'}
            </h3>
            <p className="text-xs text-ink-500 mt-1 mb-4">{PAYMENT.note}</p>

            <label className="label">Payment method</label>
            <select className="field mb-3" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT.methods.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-500 -mt-2 mb-3">
              {PAYMENT.methods.find((m) => m.label === method)?.detail}
            </p>

            <label className="label">Note (optional)</label>
            <textarea
              className="field mb-4"
              rows={2}
              placeholder="Anything we should know…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex gap-2">
              <button onClick={submit} disabled={busy} className="btn-primary flex-1">
                {busy ? 'Sending…' : 'Submit request'}
              </button>
              <button onClick={onClose} className="btn-ghost">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
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
