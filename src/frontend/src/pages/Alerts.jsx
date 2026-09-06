import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getAlerts, deleteAlert, markAlertsSeen } from '../lib/data'

export default function Alerts() {
  const { user } = useAuthStore()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const uid = user?.id

  useEffect(() => {
    if (!uid) return setLoading(false)
    ;(async () => {
      try {
        setAlerts(await getAlerts(uid))
        markAlertsSeen(uid).catch(() => {})
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    })()
  }, [uid])

  const remove = async (id) => {
    await deleteAlert(id)
    setAlerts((a) => a.filter((x) => x.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">Price alerts</h1>
      <p className="text-ink-500 text-sm mb-6">
        We email you the moment one of these conditions is met.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-500">No alerts yet.</p>
          <Link to="/products" className="text-brand-600 font-medium text-sm">
            Find a deal to watch →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="card p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold truncate">{a.name || 'Product'}</p>
                <div className="grid grid-cols-3 gap-6 mt-3 text-sm">
                  <div>
                    <p className="text-ink-400 text-xs">Current</p>
                    <p className="font-semibold">${a.currentPrice ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-ink-400 text-xs">Target</p>
                    <p className="font-semibold">
                      {a.targetPrice != null ? `$${a.targetPrice}` : `${a.targetMargin}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-400 text-xs">Status</p>
                    <p className={`font-semibold ${a.isTriggered ? 'text-emerald-600' : 'text-brand-600'}`}>
                      {a.isTriggered ? '✓ Triggered' : 'Watching'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
