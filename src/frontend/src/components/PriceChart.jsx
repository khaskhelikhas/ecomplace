import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

/**
 * history: array of { price, recordedAt } newest-first (as returned by getProduct)
 */
export default function PriceChart({ history = [] }) {
  if (!history.length) {
    return <p className="text-gray-500 text-sm">No price history yet.</p>
  }

  const points = [...history].reverse() // oldest -> newest
  const fmt = (v) => {
    try {
      const d = v?.toDate ? v.toDate() : new Date(v)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const prices = points.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)

  const data = {
    labels: points.map((p) => fmt(p.recordedAt)),
    datasets: [
      {
        data: prices,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: '#2563eb',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `$${c.parsed.y}` } } },
    scales: {
      y: {
        suggestedMin: min - (max - min) * 0.15 - 1,
        suggestedMax: max + (max - min) * 0.15 + 1,
        ticks: { callback: (v) => `$${v}` },
      },
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 5 } },
    },
  }

  return (
    <div style={{ height: 200 }}>
      <Line data={data} options={options} />
    </div>
  )
}
