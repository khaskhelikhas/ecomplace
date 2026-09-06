import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isAdmin, PLANS, PLAN_ORDER } from '../lib/plans'
import {
  listUsers,
  setUserPlan,
  getSystemStatus,
  listPaymentRequests,
  resolvePaymentRequest,
  adminLog,
  recentAdminLog,
} from '../lib/data'

const UNLOCK_KEY = 'ecp_admin_unlocked_at'
const IDLE_MS = 10 * 60 * 1000 // re-lock after 10 min idle

const freshUnlock = () => {
  const t = Number(sessionStorage.getItem(UNLOCK_KEY) || 0)
  return t && Date.now() - t < IDLE_MS
}

export default function Admin() {
  const { user, reauth } = useAuthStore()
  const admin = isAdmin(user)
  const [unlocked, setUnlocked] = useState(freshUnlock)

  // Auto re-lock on idle.
  useEffect(() => {
    if (!unlocked) return
    const bump = () => sessionStorage.setItem(UNLOCK_KEY, String(Date.now()))
    const check = () => {
      if (!freshUnlock()) {
        sessionStorage.removeItem(UNLOCK_KEY)
        setUnlocked(false)
      }
    }
    const id = setInterval(check, 30_000)
    window.addEventListener('click', bump)
    window.addEventListener('keydown', bump)
    return () => {
      clearInterval(id)
      window.removeEventListener('click', bump)
      window.removeEventListener('keydown', bump)
    }
  }, [unlocked])

  if (!admin) return <Navigate to="/" />

  if (!unlocked) {
    return (
      <StepUp
        onOk={async (pw) => {
          await reauth(pw)
          sessionStorage.setItem(UNLOCK_KEY, String(Date.now()))
          setUnlocked(true)
          adminLog('unlock', { email: user?.email })
        }}
      />
    )
  }

  return <AdminPanel user={user} />
}

function StepUp({ onOk }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await onOk(pw)
    } catch (e2) {
      setErr(e2.message || 'Wrong password.')
    }
    setBusy(false)
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-24">
      <div className="card p-6">
        <h1 className="font-bold text-lg">Admin — confirm it's you</h1>
        <p className="text-sm text-ink-500 mt-1 mb-4">
          Re-enter your password to open the admin panel.
        </p>
        {err && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
            {err}
          </p>
        )}
        <form onSubmit={submit}>
          <input
            className="field"
            type="password"
            autoFocus
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button className="btn-primary w-full mt-3" disabled={busy || !pw}>
            {busy ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AdminPanel({ user }) {
  const admin = true

  const [users, setUsers] = useState([])
  const [status, setStatus] = useState(null)
  const [requests, setRequests] = useState([])
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [savingId, setSavingId] = useState(null)

  const reload = async () => {
    const [u, s, r, l] = await Promise.all([
      listUsers(),
      getSystemStatus(),
      listPaymentRequests().catch(() => []),
      recentAdminLog().catch(() => []),
    ])
    setUsers(u)
    setStatus(s)
    setRequests(r)
    setLog(l)
  }

  useEffect(() => {
    if (!admin) return
    reload()
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [admin])

  const approve = async (req) => {
    await setUserPlan(req.userId, req.plan)
    await resolvePaymentRequest(req.id, 'approved')
    await adminLog('approve_request', { email: req.email, plan: req.plan, cycle: req.cycle })
    setUsers((us) => us.map((u) => (u.id === req.userId ? { ...u, subscriptionPlan: req.plan } : u)))
    setRequests((rs) => rs.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r)))
    recentAdminLog().then(setLog).catch(() => {})
  }
  const reject = async (req) => {
    await resolvePaymentRequest(req.id, 'rejected')
    await adminLog('reject_request', { email: req.email, plan: req.plan })
    setRequests((rs) => rs.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r)))
    recentAdminLog().then(setLog).catch(() => {})
  }

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
      const before = users.find((u) => u.id === uid)?.subscriptionPlan || 'free'
      await setUserPlan(uid, plan)
      await adminLog('set_plan', { email: before && users.find((u) => u.id === uid)?.email, from: before, to: plan })
      setUsers((us) => us.map((u) => (u.id === uid ? { ...u, subscriptionPlan: plan } : u)))
      recentAdminLog().then(setLog).catch(() => {})
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

      {/* payment requests */}
      {requests.filter((r) => r.status === 'pending').length > 0 && (
        <div className="card p-4 mb-6 border-amber-200">
          <h2 className="font-bold mb-3">
            Pending upgrade requests ({requests.filter((r) => r.status === 'pending').length})
          </h2>
          <div className="space-y-2">
            {requests
              .filter((r) => r.status === 'pending')
              .map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 rounded-lg p-3 text-sm"
                >
                  <div className="min-w-0">
                    <b>{r.email}</b> → <b className="capitalize">{r.plan}</b> ({r.cycle}) ·{' '}
                    {r.method}
                    {r.note ? <span className="text-ink-500"> — “{r.note}”</span> : null}
                    <span className="text-ink-400"> · {fmt(r.createdAt)}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approve(r)}
                      className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(r)}
                      className="text-xs border border-slate-300 px-3 py-1.5 rounded-lg"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

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

      {/* audit trail */}
      <div className="card p-4 mt-6">
        <h2 className="font-bold mb-3">Recent admin activity</h2>
        {log.length === 0 ? (
          <p className="text-ink-400 text-sm">No entries yet.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {log.map((e) => (
              <div key={e.id} className="flex justify-between border-b border-slate-100 py-1.5">
                <span>
                  <b>{e.action}</b>{' '}
                  <span className="text-ink-500">
                    {Object.entries(e.meta || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')}
                  </span>
                </span>
                <span className="text-ink-400 whitespace-nowrap">{fmt(e.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-ink-400 mt-4">
        MRR counts plans set here / by the payments webhook. Session auto-locks
        after 10 min idle. See <b>PRICING.md</b>.
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
