import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { can } from '../lib/plans'
import { categoryFeePct } from '../lib/fees'
import { getProducts } from '../lib/data'
import { track } from '../lib/firebase'

const ASIN_RE = /(?:\/dp\/|\/gp\/product\/|\/product\/|asin=|\/)([A-Z0-9]{10})(?:[/?]|$)/i

function extractAsin(input = '') {
  const s = input.trim()
  if (/^[A-Z0-9]{10}$/i.test(s)) return s.toUpperCase()
  const m = s.match(ASIN_RE)
  return m ? m[1].toUpperCase() : null
}

export default function Analyzer() {
  const { user } = useAuthStore()
  const unlocked = can(user, 'asinAnalyzer')

  const [input, setInput] = useState('')
  const [asin, setAsin] = useState(null)
  const [snapshot, setSnapshot] = useState([])

  useEffect(() => {
    getProducts().then(setSnapshot).catch(() => {})
  }, [])

  const analyze = () => {
    const a = extractAsin(input)
    setAsin(a)
    if (a) track('asin_analyze', { asin: a })
  }

  const known = useMemo(
    () => (asin ? snapshot.find((p) => (p.asin || '').toUpperCase() === asin) : null),
    [asin, snapshot]
  )

  if (!unlocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl">🔎</div>
        <h1 className="text-2xl font-bold mt-3">ASIN / URL analyzer</h1>
        <p className="text-ink-500 mt-2">
          Paste any Amazon product link and instantly get its price history,
          a full FBA profit breakdown, and a buy / pass call.
        </p>
        <Link to="/upgrade" className="btn-primary mt-6">
          Unlock with Pro →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">ASIN / URL analyzer</h1>
      <p className="text-ink-500 text-sm mb-5">
        Paste an Amazon URL or a 10-character ASIN.
      </p>

      <div className="card p-4 flex gap-2 mb-6">
        <input
          className="field"
          placeholder="https://www.amazon.com/dp/B0…  or  B0XXXXXXXX"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyze()}
        />
        <button onClick={analyze} className="btn-primary shrink-0">
          Analyze
        </button>
      </div>

      {input && !asin && (
        <p className="text-sm text-rose-600 mb-4">Could not find an ASIN in that text.</p>
      )}

      {asin && (
        <div className="space-y-6">
          <div className="card p-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="chip bg-slate-100 text-slate-600">ASIN {asin}</span>
            <a
              className="text-brand-600"
              href={`https://www.amazon.com/dp/${asin}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on Amazon ↗
            </a>
            <a
              className="text-brand-600"
              href={`https://keepa.com/#!product/1-${asin}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Keepa ↗
            </a>
            <a
              className="text-brand-600"
              href={`https://sas.selleramp.com/sas/lookup?asin=${asin}&sas_cost_price=0&SasLookup%5Bsearch_term%5D=${asin}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              SellerAmp ↗
            </a>
          </div>

          {known && (
            <div className="card p-4 border-emerald-200 bg-emerald-50/50">
              <p className="font-semibold text-sm">In our current deals</p>
              <p className="text-sm text-ink-700 mt-1">
                {known.name} — <b>${known.currentPrice}</b>
                {known.marginPercentage ? ` · ${known.marginPercentage}% off` : ''} ·{' '}
                {known.source} ·{' '}
                <span className="font-semibold">{known.recommendation}</span>
              </p>
              <Link to={`/products/${known.id}`} className="text-brand-600 text-sm">
                Open deal →
              </Link>
            </div>
          )}

          {/* free price-history charts, no API key */}
          <div className="grid sm:grid-cols-2 gap-4">
            <ChartCard
              title="Keepa price history"
              src={`https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=1&width=500&height=250&amazon=1&new=1&salesrank=1`}
            />
            <ChartCard
              title="camelcamelcamel"
              src={`https://charts.camelcamelcamel.com/us/${asin}/amazon-new.png?force=1&zero=0&w=500&h=250`}
            />
          </div>

          <Calc known={known} user={user} />
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, src }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-500 mb-2">{title}</p>
      {failed ? (
        <p className="text-xs text-ink-400 py-8 text-center">
          No chart available for this ASIN.
        </p>
      ) : (
        <img
          src={src}
          alt={title}
          className="w-full rounded"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function Calc({ known, user }) {
  const [buy, setBuy] = useState(known ? String(known.currentPrice) : '')
  const [sell, setSell] = useState(known?.previousPrice ? String(Math.round(known.previousPrice)) : '')
  const cat = known?.category || ''
  const [feePct, setFeePct] = useState(
    String(user?.defaultFeePct != null && user.defaultFeePct !== 15 ? user.defaultFeePct : categoryFeePct(cat))
  )
  const [fba, setFba] = useState('4')

  const r = useMemo(() => {
    const b = Number(buy) || 0
    const s = Number(sell) || 0
    const fee = s * ((Number(feePct) || 0) / 100)
    const fulfil = Number(fba) || 0
    const profit = s - b - fee - fulfil
    const roi = b ? (profit / b) * 100 : 0
    const fp = (Number(feePct) || 0) / 100
    const be = fp < 1 ? (b + fulfil) / (1 - fp) : 0
    return { profit, roi, be }
  }, [buy, sell, feePct, fba])

  const verdict =
    r.roi >= 40 && r.profit >= 5
      ? { t: 'BUY', c: 'text-emerald-700 bg-emerald-50' }
      : r.roi >= 20 && r.profit > 0
        ? { t: 'MAYBE', c: 'text-amber-700 bg-amber-50' }
        : { t: 'PASS', c: 'text-rose-700 bg-rose-50' }

  return (
    <div className="card p-4">
      <h3 className="font-bold mb-3">FBA profit</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <F label="Buy price ($)">
          <input className="field" type="number" value={buy} onChange={(e) => setBuy(e.target.value)} />
        </F>
        <F label="Sell price ($)">
          <input className="field" type="number" value={sell} onChange={(e) => setSell(e.target.value)} />
        </F>
        <F label={`Referral fee % ${cat ? `(${cat})` : ''}`}>
          <input className="field" type="number" value={feePct} onChange={(e) => setFeePct(e.target.value)} />
        </F>
        <F label="FBA fee / unit ($)">
          <input className="field" type="number" value={fba} onChange={(e) => setFba(e.target.value)} />
        </F>
      </div>
      <div className={`mt-4 rounded-lg p-3 grid grid-cols-3 gap-2 text-center ${verdict.c}`}>
        <M label="Profit / unit" v={`$${r.profit.toFixed(2)}`} />
        <M label="ROI" v={`${r.roi.toFixed(0)}%`} />
        <M label="Call" v={verdict.t} />
      </div>
      <p className="text-xs text-ink-500 text-center mt-2">
        Break-even sell price ≈ <b>${r.be.toFixed(2)}</b>. FBA fee is an estimate —
        check the Amazon calculator for the exact figure.
      </p>
    </div>
  )
}

const F = ({ label, children }) => (
  <div>
    <p className="text-ink-400 text-xs mb-1">{label}</p>
    {children}
  </div>
)
const M = ({ label, v }) => (
  <div>
    <p className="text-xs opacity-70">{label}</p>
    <p className="text-lg font-bold">{v}</p>
  </div>
)
