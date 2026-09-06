import { useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { categoryFeePct } from '../lib/fees'

/**
 * Retail-arbitrage profit calculator.
 * dealPrice = what the user pays now (the deal price).
 */
export default function ProfitCalc({ dealPrice = 0, suggestedSell = 0, category = '' }) {
  const { user } = useAuthStore()
  const catFee = categoryFeePct(category)
  const [sell, setSell] = useState(
    suggestedSell ? String(Math.round(suggestedSell)) : String(Math.round(dealPrice * 1.6))
  )
  // Prefer the user's saved default; otherwise the category estimate.
  const [feePct, setFeePct] = useState(
    String(user?.defaultFeePct != null && user.defaultFeePct !== 15 ? user.defaultFeePct : catFee)
  )
  const [ship, setShip] = useState(String(user?.defaultShipping ?? 0))
  const [qty, setQty] = useState('1')

  const r = useMemo(() => {
    const s = Number(sell) || 0
    const cost = Number(dealPrice) || 0
    const fee = s * ((Number(feePct) || 0) / 100)
    const shipping = Number(ship) || 0
    const q = Math.max(1, Number(qty) || 1)

    const perUnitProfit = s - cost - fee - shipping
    const roi = cost > 0 ? (perUnitProfit / cost) * 100 : 0
    const breakEvenSell = cost + shipping + s * 0 // fee depends on sell; approx below
    // solve s* : s* - cost - s**fee% - shipping = 0  ->  s* = (cost+shipping)/(1-fee%)
    const fp = (Number(feePct) || 0) / 100
    const beSell = fp < 1 ? (cost + shipping) / (1 - fp) : 0

    return {
      perUnitProfit,
      roi,
      totalProfit: perUnitProfit * q,
      totalOutlay: (cost + shipping) * q,
      beSell,
      q,
    }
  }, [sell, feePct, ship, qty, dealPrice])

  const good = r.perUnitProfit > 0

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-bold mb-3 flex items-center gap-2">🧮 Profit calculator</h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Deal price (cost)">
          <input className="field" value={`$${dealPrice}`} disabled />
        </Field>
        <Field label="Your sell price ($)">
          <input className="field" type="number" value={sell} onChange={(e) => setSell(e.target.value)} />
        </Field>
        <Field label={`Marketplace fee % (est. ${catFee}% for ${category || 'general'})`}>
          <input className="field" type="number" value={feePct} onChange={(e) => setFeePct(e.target.value)} />
        </Field>
        <Field label="Shipping / unit ($)">
          <input className="field" type="number" step="0.01" value={ship} onChange={(e) => setShip(e.target.value)} />
        </Field>
        <Field label="Quantity">
          <input className="field" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
      </div>

      <div className={`mt-4 rounded-lg p-3 ${good ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Profit / unit" value={`$${r.perUnitProfit.toFixed(2)}`} good={good} />
          <Metric label="ROI" value={`${r.roi.toFixed(0)}%`} good={r.roi > 0} />
          <Metric label={`Total (×${r.q})`} value={`$${r.totalProfit.toFixed(0)}`} good={r.totalProfit > 0} />
        </div>
        <p className="text-xs text-ink-500 text-center mt-2">
          Break-even sell price ≈ <b>${r.beSell.toFixed(2)}</b> · outlay ${r.totalOutlay.toFixed(0)}
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-ink-400 text-xs mb-1">{label}</p>
      {children}
    </div>
  )
}

function Metric({ label, value, good }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`text-lg font-bold ${good ? 'text-emerald-700' : 'text-rose-700'}`}>{value}</p>
    </div>
  )
}
