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
        <ul className="text-sm text-ink-600 mt-5 space-y-1.5 text-left inline-block">
          <li>✓ Keepa &amp; camelcamelcamel price-history charts</li>
          <li>✓ FBA profit, ROI and break-even calculator</li>
          <li>✓ <b>Bulk mode</b> — score a whole list of ASINs at once, export CSV</li>
          <li>✓ Cross-checked against our live deal feed</li>
        </ul>
        <div className="mt-6">
          <Link to="/upgrade" className="btn-primary">
            Unlock with Pro →
          </Link>
        </div>
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

      <BulkPanel snapshot={snapshot} />
    </div>
  )
}

function BulkPanel({ snapshot }) {
  const [text, setText] = useState('')
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = () => {
    setBusy(true)
    const seen = new Set()
    const tokens = text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 200)
    const out = []
    for (const tok of tokens) {
      const a = extractAsin(tok)
      if (!a || seen.has(a)) continue
      seen.add(a)
      const hit = snapshot.find((p) => (p.asin || '').toUpperCase() === a)
      let call = '—'
      let profit = null
      let roi = null
      if (hit && hit.previousPrice > hit.currentPrice) {
        const buyP = hit.currentPrice
        const sellP = hit.previousPrice
        const fee = sellP * (categoryFeePct(hit.category || '') / 100)
        const p = sellP - buyP - fee - 4
        profit = p
        roi = buyP ? (p / buyP) * 100 : 0
        call = roi >= 40 && p >= 5 ? 'BUY' : roi >= 20 && p > 0 ? 'MAYBE' : 'PASS'
      }
      out.push({
        asin: a,
        inDeals: !!hit,
        name: hit?.name || '',
        price: hit?.currentPrice ?? '',
        listPrice: hit?.previousPrice ?? '',
        marginPct: hit?.marginPercentage ?? '',
        rec: hit?.recommendation || '',
        profit,
        roi,
        call,
      })
    }
    setRows(out)
    setBusy(false)
    track('bulk_analyze', { count: out.length })
  }

  const downloadCsv = () => {
    const head = [
      'ASIN', 'In our deals', 'Name', 'Price', 'List price', 'Margin %', 'Signal',
      'Est. profit/unit', 'Est. ROI %', 'Call', 'Amazon', 'Keepa',
    ]
    const body = rows.map((r) =>
      [
        r.asin, r.inDeals ? 'yes' : 'no', r.name, r.price, r.listPrice, r.marginPct, r.rec,
        r.profit != null ? r.profit.toFixed(2) : '',
        r.roi != null ? r.roi.toFixed(0) : '',
        r.call,
        `https://www.amazon.com/dp/${r.asin}`,
        `https://keepa.com/#!product/1-${r.asin}`,
      ]
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [head.join(','), ...body].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-analysis-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card p-5 mt-8">
      <p className="font-bold flex items-center gap-2">
        Bulk analysis
        <span className="chip bg-brand-100 text-brand-700">Pro</span>
      </p>
      <p className="text-sm text-ink-500 mt-1 mb-3">
        One ASIN or Amazon URL per line (up to 200). Each is matched against our
        live deals with an FBA profit estimate and a buy / pass call.
      </p>
      <textarea
        className="field font-mono text-xs h-36"
        placeholder={'B0XXXXXXXX\nhttps://www.amazon.com/dp/B0YYYYYYYY\n…'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2 mt-3">
        <button onClick={run} disabled={busy || !text.trim()} className="btn-primary">
          {busy ? 'Analyzing…' : 'Analyze all'}
        </button>
        {rows?.length > 0 && (
          <button onClick={downloadCsv} className="btn-ghost">
            ⬇ Download CSV
          </button>
        )}
      </div>

      {rows &&
        (rows.length === 0 ? (
          <p className="text-sm text-rose-600 mt-4">No valid ASINs found in that list.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-400 text-xs border-b">
                  <th className="py-2 pr-3">ASIN</th>
                  <th className="py-2 pr-3">In deals</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Margin</th>
                  <th className="py-2 pr-3">Est. ROI</th>
                  <th className="py-2 pr-3">Call</th>
                  <th className="py-2 pr-3">Links</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.asin} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{r.asin}</td>
                    <td className="py-2 pr-3">
                      {r.inDeals ? <span className="text-emerald-600">✓</span> : '—'}
                    </td>
                    <td className="py-2 pr-3">{r.price !== '' ? `$${r.price}` : '—'}</td>
                    <td className="py-2 pr-3">{r.marginPct !== '' ? `${r.marginPct}%` : '—'}</td>
                    <td className="py-2 pr-3">{r.roi != null ? `${r.roi.toFixed(0)}%` : '—'}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          r.call === 'BUY'
                            ? 'text-emerald-700 font-semibold'
                            : r.call === 'MAYBE'
                              ? 'text-amber-700 font-semibold'
                              : r.call === 'PASS'
                                ? 'text-rose-700'
                                : 'text-ink-400'
                        }
                      >
                        {r.call}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <a
                        className="text-brand-600"
                        href={`https://www.amazon.com/dp/${r.asin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        A
                      </a>
                      {' · '}
                      <a
                        className="text-brand-600"
                        href={`https://keepa.com/#!product/1-${r.asin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        K
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-ink-400 mt-2">
              {rows.filter((r) => r.inDeals).length} of {rows.length} are in our current
              deal set. ROI is a rough FBA estimate (list price as resale, $4 FBA fee) —
              open Keepa for the full picture.
            </p>
          </div>
        ))}
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
