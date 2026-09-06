import { useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { categoryFeePct } from '../lib/fees'

/**
 * Retail-arbitrage profit calculator.
 * dealPrice = what the user pays now (the deal price).
 */

// Marketplace presets: base fee % + a default per-unit fulfilment cost.
// `fee: null` means "use the category estimate".
const MARKETS = {
  'amazon-fba': { label: 'Amazon FBA', fee: null, fulfil: 4, fulfilLabel: 'FBA fee / unit ($)' },
  'amazon-fbm': { label: 'Amazon FBM', fee: null, fulfil: 0, fulfilLabel: 'Ship + prep / unit ($)' },
  ebay: { label: 'eBay', fee: 13.5, fulfil: 0, fulfilLabel: 'Ship / unit ($)' },
  walmart: { label: 'Walmart', fee: 15, fulfil: 0, fulfilLabel: 'Ship / unit ($)' },
}

export default function ProfitCalc({ dealPrice = 0, suggestedSell = 0, category = '' }) {
  const { user } = useAuthStore()
  const catFee = categoryFeePct(category)

  const [market, setMarket] = useState('amazon-fba')
  const [sell, setSell] = useState(
    suggestedSell ? String(Math.round(suggestedSell)) : String(Math.round(dealPrice * 1.6))
  )
  const [feePct, setFeePct] = useState(
    String(user?.defaultFeePct != null && user.defaultFeePct !== 15 ? user.defaultFeePct : catFee)
  )
  const [fulfil, setFulfil] = useState(String(user?.defaultShipping ?? MARKETS['amazon-fba'].fulfil))
  const [prep, setPrep] = useState('0')
  const [qty, setQty] = useState('1')
  const [targetRoi, setTargetRoi] = useState('30')

  const applyMarket = (key) => {
    setMarket(key)
    const m = MARKETS[key]
    setFeePct(String(m.fee == null ? catFee : m.fee))
    setFulfil(String(m.fulfil))
  }

  const m = MARKETS[market]

  const r = useMemo(() => {
    const s = Number(sell) || 0
    const cost = Number(dealPrice) || 0
    const fp = (Number(feePct) || 0) / 100
    const ful = Number(fulfil) || 0
    const pr = Number(prep) || 0
    const q = Math.max(1, Number(qty) || 1)
    const tRoi = (Number(targetRoi) || 0) / 100

    const fee = s * fp
    const perUnitProfit = s - cost - fee - ful - pr
    const roi = cost > 0 ? (perUnitProfit / cost) * 100 : 0

    // Break-even sell: s* - cost - s*fp - ful - pr = 0
    const beSell = fp < 1 ? (cost + ful + pr) / (1 - fp) : 0
    // Max buy price to hit the target ROI at this sell price:
    //   (s - s*fp - ful - pr - buy) / buy = tRoi  ->  buy = net / (1 + tRoi)
    const netAfterSaleCosts = s - fee - ful - pr
    const maxBuy = 1 + tRoi > 0 ? netAfterSaleCosts / (1 + tRoi) : 0

    return {
      perUnitProfit,
      roi,
      totalProfit: perUnitProfit * q,
      totalOutlay: (cost + ful + pr) * q,
      beSell,
      maxBuy,
      q,
    }
  }, [sell, feePct, fulfil, prep, qty, targetRoi, dealPrice])

  const good = r.perUnitProfit > 0
  const priceOk = r.maxBuy >= (Number(dealPrice) || 0)

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-bold flex items-center gap-2">🧮 Profit calculator</h3>
        <select
          className="field py-1 w-auto text-sm"
          value={market}
          onChange={(e) => applyMarket(e.target.value)}
        >
          {Object.entries(MARKETS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Deal price (cost)">
          <input className="field" value={`$${dealPrice}`} disabled />
        </Field>
        <Field label="Your sell price ($)">
          <input className="field" type="number" value={sell} onChange={(e) => setSell(e.target.value)} />
        </Field>
        <Field label={`Fee % (est. ${catFee}% for ${category || 'general'})`}>
          <input className="field" type="number" value={feePct} onChange={(e) => setFeePct(e.target.value)} />
        </Field>
        <Field label={m.fulfilLabel}>
          <input
            className="field"
            type="number"
            step="0.01"
            value={fulfil}
            onChange={(e) => setFulfil(e.target.value)}
          />
        </Field>
        <Field label="Prep / unit ($)">
          <input className="field" type="number" step="0.01" value={prep} onChange={(e) => setPrep(e.target.value)} />
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
          Break-even sell ≈ <b>${r.beSell.toFixed(2)}</b> · outlay ${r.totalOutlay.toFixed(0)}
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-ink-600">
          Target ROI
          <input
            className="field py-1 w-16"
            type="number"
            value={targetRoi}
            onChange={(e) => setTargetRoi(e.target.value)}
          />
          %
        </label>
        <p className={priceOk ? 'text-emerald-700' : 'text-rose-700'}>
          Pay up to <b>${r.maxBuy.toFixed(2)}</b>
          <span className="text-ink-400">
            {' '}
            · you'd pay ${dealPrice} {priceOk ? '✓' : '— too high'}
          </span>
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
