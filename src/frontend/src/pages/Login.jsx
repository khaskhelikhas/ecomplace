import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, resetPassword, error } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [resetMode, setResetMode] = useState(false)
  const [resetMsg, setResetMsg] = useState(null)

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch {
      /* error shown from store */
    }
    setLoading(false)
  }

  const doReset = async () => {
    setResetMsg(null)
    if (!form.email) {
      setResetMsg({ t: 'err', m: 'Enter your email first.' })
      return
    }
    setLoading(true)
    try {
      await resetPassword(form.email)
      setResetMsg({ t: 'ok', m: `Reset link sent to ${form.email}. Check your inbox.` })
    } catch (err) {
      setResetMsg({ t: 'err', m: err.message })
    }
    setLoading(false)
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink-900">
        {resetMode ? 'Reset your password' : 'Welcome back'}
      </h1>
      <p className="text-ink-500 text-sm mt-1 mb-6">
        {resetMode
          ? 'Enter your email and we’ll send a reset link.'
          : 'Sign in to track deals and price alerts.'}
      </p>

      <form onSubmit={submit} className="space-y-4">
        {error && !resetMode && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {resetMsg && (
          <div
            className={`text-sm px-4 py-3 rounded-lg ${
              resetMsg.t === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {resetMsg.m}
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            name="email"
            value={form.email}
            onChange={change}
            placeholder="you@example.com"
            required
          />
        </div>

        {!resetMode && (
          <div>
            <div className="flex items-center justify-between">
              <label className="label mb-0">Password</label>
              <button
                type="button"
                onClick={() => {
                  setResetMode(true)
                  setResetMsg(null)
                }}
                className="text-xs text-brand-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              className="field mt-1.5"
              type="password"
              name="password"
              value={form.password}
              onChange={change}
              placeholder="••••••••"
              required
            />
          </div>
        )}

        {resetMode ? (
          <div className="space-y-2">
            <button type="button" onClick={doReset} disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setResetMode(false)
                setResetMsg(null)
              }}
              className="btn-ghost w-full"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        )}
      </form>

      {!resetMode && (
        <p className="text-sm text-ink-500 mt-6 text-center">
          New here?{' '}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      )}
    </AuthShell>
  )
}

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-brand-600 text-white p-12">
        <div className="flex items-center gap-2 font-extrabold text-xl">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-white/15">🛍️</span>
          EcomPlace
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Real deals.<br />Smart signals.<br />Zero noise.
          </h2>
          <p className="text-white/80 mt-4 max-w-sm">
            Best prices from Amazon, Walmart, eBay, Home Depot and more — refreshed
            every 20 minutes, each tagged buy / watch / skip.
          </p>
        </div>
        <p className="text-white/60 text-sm">Free forever · no card required</p>
      </div>

      <div className="flex items-center justify-center p-6 bg-[#f6f7fb]">
        <div className="w-full max-w-md card p-8">
          <div className="lg:hidden flex items-center gap-2 font-extrabold text-lg text-brand-600 mb-6">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50">🛍️</span>
            EcomPlace
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
