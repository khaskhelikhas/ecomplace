import { useEffect, useMemo, useState } from 'react'
import { Chart } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
} from 'chart.js'
import { useAuthStore } from '../store/authStore'
import { getSourcing, getDailyStats } from '../lib/data'

ChartJS.register(
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip
)

const DAYS = 14
const keyOf = (d) => d.toISOString().slice(0, 10)
function lastNDays(n) {
  const out = []
  const t = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(t)
    d.setDate(t.getDate() - i)
    out.push(keyOf(d))
  }
  return out
}

export default function ProfitTrend() {
  const { user } = useAuthStore()
  const feePct = user?.defaultFeePct ?? 15
  const ship = user?.defaultShipping ?? 0

  const [mode, setMode] = useState('sales')
  const [sourcing, setSourcing] = useState([])
  const [daily, setDaily] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [s, d] = await Promise.all([
        user?.id ? getSourcing(user.id).catch(() => []) : Promise.resolve([]),
        getDailyStats().catch(() => []),
      ])
      if (!alive) return
      setSourcing(s)
      setDaily(d)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [user?.id])

  const sales = useMemo(() => {
    const rows = sourcing.filter((it) => it.status === 'sold' && it.soldAt)
    const profitOf = (it) => {
      const cost = Number(it.dealPrice) || 0
      const qty = Math.max(1, Number(it.qty) || 1)
      const sell = Number(it.sellPrice) || Math.round(cost * 1.6)
      const fee = sell * (feePct / 100)
      return (sell - cost - fee - ship) * qty
    }
    const keys = lastNDays(DAYS)
    const perDay = Object.fromEntries(keys.map((k) => [k, 0]))
    let allTime = 0
    let month = 0
    let week = 0
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const monthAgo = new Date(now)
    monthAgo.setDate(now.getDate() - 30)
    for (const it of rows) {
      const p = profitOf(it)
      allTime += p
      const dt = new Date(it.soldAt)
      if (dt >= monthAgo) month += p
      if (dt >= weekAgo) week += p
      const k = String(it.soldAt).slice(0, 10)
      if (k in perDay) perDay[k] += p
    }
    const series = keys.map((k) => Math.round(perDay[k]))
    let run = 0
    const cum = series.map((v) => (run += v))
    return { keys, series, cum, allTime, month, week, hasAny: rows.length > 0 }
  }, [sourcing, feePct, ship])

  const opp = useMemo(() => {
    const keys = lastNDays(DAYS)
    const map = Object.fromEntries(daily.map((d) => [d.date, d]))
    const flip = keys.map((k) => Math.round(map[k]?.totalFlip || 0))
    const nonzero = flip.filter((v) => v > 0)
    const avg = nonzero.length
      ? Math.round(nonzero.reduce((a, b) => a + b, 0) / nonzero.length)
      : 0
    return {
      keys,
      flip,
      avg,
      today: flip[flip.length - 1] || 0,
      best: flip.length ? Math.max(...flip) : 0,
      hasAny: nonzero.length > 0,
    }
  }, [daily])

  const src = mode === 'sales' ? sales : opp
  const labels = src.keys.map((k) => k.slice(5))

  const data =
    mode === 'sales'
      ? {
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Profit/day',
              data: sales.series,
              backgroundColor: '#2a78d6',
              borderRadius: 3,
              maxBarThickness: 16,
              yAxisID: 'y',
            },
            {
              type: 'line',
              label: 'Running total',
              data: sales.cum,
              borderColor: '#1baf7a',
              borderDash: [5, 4],
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              yAxisID: 'y1',
            },
          ],
        }
      : {
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Flip $ on the board',
              data: opp.flip,
              backgroundColor: '#2a78d6',
              borderRadius: 3,
              maxBarThickness: 16,
              yAxisID: 'y',
            },
          ],
        }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: $${Math.round(c.parsed.y)}` } },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
      },
      y: {
        grid: { color: 'rgba(148,163,184,0.2)' },
        ticks: { font: { size: 10 }, callback: (v) => `$${v}` },
      },
      ...(mode === 'sales'
        ? {
            y1: {
              position: 'right',
              grid: { display: false },
              ticks: { font: { size: 10 }, callback: (v) => `$${v}` },
            },
          }
        : {}),
    },
  }

  return (
    <section className="card p-5 sm:p-6 mb-8">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-bold">📈 Profit from deals</h2>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium shrink-0">
          {[
            ['sales', 'My sales'],
            ['opportunity', 'Deal opportunity'],
          ].map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md ${
                mode === m ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-56" />
      ) : mode === 'sales' && !sales.hasAny ? (
        <p className="text-sm text-ink-500 py-10 text-center">
          Mark items <b>Sold</b> in your{' '}
          <a href="/sourcing" className="text-brand-600">
            sourcing list
          </a>{' '}
          and your realized profit shows up here.
        </p>
      ) : mode === 'opportunity' && !opp.hasAny ? (
        <p className="text-sm text-ink-500 py-10 text-center">
          Collecting daily data — check back after a few refreshes.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {mode === 'sales' ? (
              <>
                <Tile label="This week" value={`$${sales.week.toFixed(0)}`} />
                <Tile label="This month" value={`$${sales.month.toFixed(0)}`} />
                <Tile
                  label="Realized, all-time"
                  value={`$${sales.allTime.toFixed(0)}`}
                  accent="text-emerald-600"
                />
              </>
            ) : (
              <>
                <Tile label="On the board today" value={`$${opp.today}`} />
                <Tile label="14-day avg" value={`$${opp.avg}`} />
                <Tile label="Best day" value={`$${opp.best}`} accent="text-emerald-600" />
              </>
            )}
          </div>
          <div style={{ height: 220 }}>
            <Chart type="bar" data={data} options={options} />
          </div>
          <p className="text-[11px] text-ink-400 mt-2">
            {mode === 'sales'
              ? 'From items marked Sold in your sourcing list, using your default fees.'
              : 'Total estimated flip margin across all live deals each day — a market gauge, not your earnings.'}
          </p>
        </>
      )}
    </section>
  )
}

function Tile({ label, value, accent = 'text-ink-900' }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}
