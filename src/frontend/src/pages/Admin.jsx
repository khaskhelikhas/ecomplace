import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isAdmin, PLANS, PLAN_ORDER } from '../lib/plans'
import { listUsers, setUserPlan, getSystemStatus } from '../lib/data'

export default function Admin() {
  const { user } = useAuthStore()
  const admin = isAdmin(user)

  const [users, setUsers] = useState([])
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    if (!admin) return
    ;(async () => {
      try {
        const [u, s] = await Promise.all([listUsers(), getSystemStatus()])
        setUsers(u)
        setStatus(s)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    })()
  }, [admin])

  const fmt = (v) => {
    try {
      const d = v?.toDate ? v.toDate() : v ? new Date(v) : null
      return d ? d.toLocaleString() : '—'
    } catch {
      return '—'
    }
  }

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s
      ? users.filter(
          (u) =>
            (u.email || '').toLowerCase().includes(s) ||
            (u.fullName || '').toLowerCase().includes(s)
        )
      : users
    return [...list].sort((a, b) => {
      const da = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
      const db_ = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
      return db_ - da
    })
  }, [users, q])

  const counts = useMemo(() => {
    const c = Object.fromEntries(PLAN_ORDER.map((k) => [k, 0]))
    users.forEach((u) => {
      const k = u.subscriptionPlan || 'free'
      c[k] = (c[k] || 0) + 1
    })
    return c
  }, [users])

  const mrr = PLAN_ORDER.reduce((sum, k) => sum + counts[k] * (PLANS[k].price || 0), 0)

  const changePlan = async (uid, plan) => {
    setSavingId(uid)
    try {
      await setUserPlan(uid, plan)
      setUsers((us) => us.map((u) => (u.id === uid ? { ...u, subscriptionPlan: plan } : u)))
    } catch (e) {
      console.error(e)
      alert('Could not update plan (are you an admin?)')
    }
    setSavingId(null)
  }

  if (!admin) return <Navigate to="/" />
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-ink-400">Loading admin…</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-1">Admin</h1>
      <p className="text-ink-500 text-sm mb-6">Users, plans and system health.</p>

      {/* system health */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <Stat label="Total users" value={users.length} />
        <Stat label="Free" value={counts.free} />
        <Stat label="Starter" value={counts.starter} accent="text-brand-600" />
        <Stat label="Pro" value={counts.pro} accent="text-brand-600" />
        <Stat label="Agency" value={counts.agency} accent="text-brand-600" />
        <Stat label="MRR" value={`$${mrr}`} accent="text-emerald-600" />
      </div>

      <div className="card p-4 mb-6 text-sm flex flex-wrap gap-x-8 gap-y-2">
        <span>
          Deals in snapshot: <b>{status?.dealCount ?? '—'}</b>
        </span>
        <span>
          Snapshot updated: <b>{fmt(status?.snapshotUpdatedAt)}</b>
        </span>
        <span>
          Last refresh:{' '}
          <b className={status?.refresh?.ok === false ? 'text-rose-600' : 'text-emerald-600'}>
            {status?.refresh ? (status.refresh.ok ? 'OK' : 'FAILED') : '—'}
          </b>{' '}
          {fmt(status?.refresh?.ranAt)}
          {status?.refresh?.error ? ` — ${status.refresh.error}` : ''}
        </span>
      </div>

      {/* users */}
      <div className="card p-4">
        <input
          className="field mb-4"
          placeholder="Search email or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-500 border-b border-slate-200">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2 pr-4">Plan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{u.email}</td>
                  <td className="py-2 pr-4 text-ink-600">{u.fullName || '—'}</td>
                  <td className="py-2 pr-4 text-ink-500 whitespace-nowrap">{fmt(u.createdAt)}</td>
                  <td className="py-2 pr-4">
                    <select
                      className="field py-1 w-32"
                      value={u.subscriptionPlan || 'free'}
                      disabled={savingId === u.id}
                      onChange={(e) => changePlan(u.id, e.target.value)}
                    >
                      {PLAN_ORDER.map((k) => (
                        <option key={k} value={k}>
                          {PLANS[k].name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-ink-400 py-6 text-center">No users.</p>}
        </div>
      </div>

      <p className="text-xs text-ink-400 mt-4">
        "MRR (manual)" counts plans you set here. Once Stripe is connected it
        reflects real subscriptions. See <b>PRICING.md</b>.
      </p>
    </div>
  )
}

function Stat({ label, value, accent = 'text-ink-900' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}
