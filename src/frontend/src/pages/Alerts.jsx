import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  getAlerts,
  deleteAlert,
  markAlertsSeen,
  updateAlertTarget,
  createCategoryAlert,
  getProducts,
} from '../lib/data'
import { can, limitOf, planOf } from '../lib/plans'

export default function Alerts() {
  const { user } = useAuthStore()
  const [alerts, setAlerts] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const uid = user?.id
  const alertLimit = limitOf(user, 'alerts')
  const canCategory = can(user, 'categoryAlerts')

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
      getProducts()
        .then((ps) => setCats([...new Set(ps.map((p) => p.category).filter(Boolean))].sort()))
        .catch(() => {})
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const remove = async (id) => {
    await deleteAlert(id)
    setAlerts((a) => a.filter((x) => x.id !== id))
  }

  const used = alerts.length
  const nearLimit = alertLimit !== Infinity && used >= alertLimit - 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
        <h1 className="text-2xl font-bold">Price alerts</h1>
        <span className="text-sm text-ink-500">
          {used}
          {alertLimit === Infinity ? '' : ` / ${alertLimit}`} used ·{' '}
          <span className="capitalize">{planOf(user).name}</span> plan
        </span>
      </div>
      <p className="text-ink-500 text-sm mb-4">
        We email you the moment one of these conditions is met.
      </p>

      {nearLimit && alertLimit !== Infinity && (
        <div className="card p-3 mb-4 bg-amber-50 border-amber-200 text-amber-800 text-sm flex items-center justify-between gap-3">
          <span>You've used {used} of {alertLimit} alerts on the {planOf(user).name} plan.</span>
          <Link to="/upgrade" className="font-semibold underline shrink-0">
            Get more →
          </Link>
        </div>
      )}

      {/* category alert — Starter+ */}
      <CategoryAlertBox
        canUse={canCategory}
        cats={cats}
        onCreate={async (category, targetMargin) => {
          if (alertLimit !== Infinity && alerts.length >= alertLimit) {
            alert(`Your ${planOf(user).name} plan is capped at ${alertLimit} alerts.`)
            return
          }
          await createCategoryAlert({ userId: uid, category, targetMargin })
          fetchAlerts()
        }}
      />

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

function CategoryAlertBox({ canUse, cats, onCreate }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [pct, setPct] = useState('40')
  const [busy, setBusy] = useState(false)

  if (!canUse) {
    return (
      <div className="card p-4 mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">Category alerts</p>
          <p className="text-xs text-ink-500">
            Get emailed when <b>any</b> deal in a category hits your discount target.
          </p>
        </div>
        <Link to="/upgrade" className="chip bg-brand-100 text-brand-700 shrink-0">
          Starter feature →
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-4 mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between font-semibold text-sm"
      >
        + New category alert
        <span className="text-ink-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="grid sm:grid-cols-3 gap-3 mt-3 items-end">
          <div>
            <label className="label">Category</label>
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Choose…</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Discount reaches %</label>
            <input
              className="field"
              type="number"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
            />
          </div>
          <button
            disabled={busy || !category}
            onClick={async () => {
              setBusy(true)
              try {
                await onCreate(category, Number(pct) || 0)
                setOpen(false)
                setCategory('')
              } finally {
                setBusy(false)
              }
            }}
            className="btn-primary"
          >
            {busy ? 'Adding…' : 'Add alert'}
          </button>
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

  const isCategory = a.type === 'category'

  return (
    <div className="card p-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold truncate">
          {isCategory && <span className="chip bg-slate-100 text-slate-600 mr-1">category</span>}
          {a.name || 'Product'}
        </p>
        <div className="grid grid-cols-3 gap-6 mt-3 text-sm">
          <div>
            <p className="text-ink-400 text-xs">{isCategory ? 'Watching' : 'Current'}</p>
            <p className="font-semibold">{isCategory ? a.category : `$${a.currentPrice ?? '—'}`}</p>
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
