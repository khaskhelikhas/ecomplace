import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getAlerts, deleteAlert, markAlertsSeen, updateAlertTarget } from '../lib/data'

export default function Alerts() {
  const { user } = useAuthStore()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const uid = user?.id

  const fetchAlerts = async () => {
    if (!uid) return
    try {
      setAlerts(await getAlerts(uid))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!uid) return setLoading(false)
    ;(async () => {
      await fetchAlerts()
      markAlertsSeen(uid).catch(() => {})
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <AlertRow key={a.id} a={a} onRemove={remove} onSaved={fetchAlerts} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertRow({ a, onRemove, onSaved }) {
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState(
    a.targetPrice != null ? String(a.targetPrice) : String(a.targetMargin ?? '')
  )
  const isPrice = a.targetPrice != null

  const save = async () => {
    const n = Number(val)
    if (!n) return
    await updateAlertTarget(a.id, isPrice ? { targetPrice: n } : { targetMargin: n })
    setEdit(false)
    onSaved()
  }

  return (
    <div className="card p-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold truncate">{a.name || 'Product'}</p>
        <div className="grid grid-cols-3 gap-6 mt-3 text-sm">
          <div>
            <p className="text-ink-400 text-xs">Current</p>
            <p className="font-semibold">${a.currentPrice ?? '—'}</p>
          </div>
          <div>
            <p className="text-ink-400 text-xs">Target {isPrice ? 'price' : 'discount'}</p>
            {edit ? (
              <div className="flex gap-1 mt-0.5">
                <input
                  className="field py-1 w-20"
                  type="number"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                />
                <button onClick={save} className="text-xs text-brand-600 font-semibold px-1">
                  Save
                </button>
              </div>
            ) : (
              <p className="font-semibold">
                {isPrice ? `$${a.targetPrice}` : `${a.targetMargin}%`}{' '}
                <button
                  onClick={() => setEdit(true)}
                  className="text-xs text-brand-600 font-normal ml-1"
                >
                  edit
                </button>
              </p>
            )}
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
        onClick={() => onRemove(a.id)}
        className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg shrink-0"
      >
        Delete
      </button>
    </div>
  )
}
